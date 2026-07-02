import type { ArgumentValue, FieldSelection, GovernanceConfig, IntrospectionSchemaModel, SchemaTypeRef } from '../types';
import { getSelectableFields, isLeafField } from '../schema/schema-utils';
import { isFieldHidden } from '../governance/resolve';

/** Toggles the field at `path` (array of field names from the selection root). Auto-creates parent nodes as needed. */
export function toggleSelectionPath(tree: FieldSelection[], path: string[]): FieldSelection[] {
  if (path.length === 0) return tree;
  const [head, ...rest] = path;
  const existingIndex = tree.findIndex((n) => n.name === head);

  if (rest.length === 0) {
    if (existingIndex >= 0) {
      return tree.filter((_, i) => i !== existingIndex);
    }
    return [...tree, { name: head, children: [] }];
  }

  if (existingIndex >= 0) {
    const node = tree[existingIndex];
    const newChildren = toggleSelectionPath(node.children, rest);
    return tree.map((n, i) => (i === existingIndex ? { ...node, children: newChildren } : n));
  }

  return [...tree, { name: head, children: toggleSelectionPath([], rest) }];
}

export function isPathSelected(tree: FieldSelection[], path: string[]): boolean {
  if (path.length === 0) return false;
  const [head, ...rest] = path;
  const node = tree.find((n) => n.name === head);
  if (!node) return false;
  if (rest.length === 0) return true;
  return isPathSelected(node.children, rest);
}

/**
 * Sets (or, when `branch` is null, removes) the node at `path`, auto-creating
 * intermediate parent nodes as needed. Unlike `toggleSelectionPath` this
 * replaces the target node's children wholesale, which lets us select an
 * object together with a default set of sub-fields in a single update.
 */
export function setSelectionBranch(tree: FieldSelection[], path: string[], branch: FieldSelection | null): FieldSelection[] {
  if (path.length === 0) return tree;
  const [head, ...rest] = path;
  const existingIndex = tree.findIndex((n) => n.name === head);

  if (rest.length === 0) {
    if (branch === null) {
      return existingIndex >= 0 ? tree.filter((_, i) => i !== existingIndex) : tree;
    }
    if (existingIndex >= 0) {
      return tree.map((n, i) => (i === existingIndex ? branch : n));
    }
    return [...tree, branch];
  }

  if (existingIndex >= 0) {
    const node = tree[existingIndex];
    return tree.map((n, i) => (i === existingIndex ? { ...node, children: setSelectionBranch(node.children, rest, branch) } : n));
  }

  // Parent doesn't exist yet: nothing to remove, otherwise create it and descend.
  if (branch === null) return tree;
  return [...tree, { name: head, children: setSelectionBranch([], rest, branch) }];
}

/** Resolves the schema type reference reached by walking `path` from `rootTypeRef`. */
export function resolveTypeRefAtPath(model: IntrospectionSchemaModel, rootTypeRef: SchemaTypeRef, path: string[]): SchemaTypeRef | null {
  let ref = rootTypeRef;
  for (const segment of path) {
    const field = getSelectableFields(model, ref).find((f) => f.name === segment);
    if (!field) return null;
    ref = field.type;
  }
  return ref;
}

/**
 * Builds the selection branch used when the user checks an object node: the
 * object with all of its directly-nested scalar/enum (leaf) fields selected,
 * skipping governance-hidden fields. Returns null when the object has no
 * directly selectable leaf fields (the user must expand and pick nested ones).
 */
export function buildObjectDefaultBranch(
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
  rootTypeRef: SchemaTypeRef,
  path: string[],
): FieldSelection | null {
  const typeRef = resolveTypeRefAtPath(model, rootTypeRef, path);
  if (!typeRef || path.length === 0) return null;

  const leaves = getSelectableFields(model, typeRef)
    .filter(
      (f) =>
        isLeafField(model, f.type) &&
        !isFieldHidden(governance, [...path, f.name].join('.')) &&
        // Don't auto-select fields that require arguments - the user selects those
        // explicitly and fills the argument in the field editor.
        !f.args.some((a) => a.isRequired),
    )
    .map<FieldSelection>((f) => ({ name: f.name, children: [] }));

  if (leaves.length === 0) return null;
  return { name: path[path.length - 1], children: leaves };
}

/** Removes object-type branches left with zero children after a leaf was toggled off. */
export function pruneEmptySelection(
  model: IntrospectionSchemaModel,
  parentTypeRef: SchemaTypeRef,
  tree: FieldSelection[],
): FieldSelection[] {
  const byName = new Map(getSelectableFields(model, parentTypeRef).map((f) => [f.name, f]));
  const result: FieldSelection[] = [];

  for (const node of tree) {
    const field = byName.get(node.name);
    if (!field) continue;

    if (isLeafField(model, field.type)) {
      result.push(node);
      continue;
    }

    const prunedChildren = pruneEmptySelection(model, field.type, node.children);
    if (prunedChildren.length === 0) continue;
    result.push({ ...node, children: prunedChildren });
  }

  return result;
}

/**
 * Sets or removes an argument value on the (already selected) field at `path`.
 * No-op when the field is not present in the selection. Removing the last
 * value leaves an empty `args` array, which the query builder treats as none.
 */
export function updateFieldArgument(
  tree: FieldSelection[],
  path: string[],
  argPath: string,
  value: ArgumentValue | null,
): FieldSelection[] {
  if (path.length === 0) return tree;
  const [head, ...rest] = path;
  const idx = tree.findIndex((n) => n.name === head);
  if (idx < 0) return tree;
  const node = tree[idx];

  if (rest.length === 0) {
    const others = (node.args ?? []).filter((a) => a.path !== argPath);
    const args = value === null ? others : [...others, value];
    return tree.map((n, i) => (i === idx ? { ...node, args } : n));
  }

  return tree.map((n, i) => (i === idx ? { ...node, children: updateFieldArgument(node.children, rest, argPath, value) } : n));
}

/** Counts total selected nodes (leaves + object nodes) in the tree. */
export function countSelectionNodes(tree: FieldSelection[]): number {
  let count = 0;
  for (const node of tree) {
    count += 1;
    count += countSelectionNodes(node.children);
  }
  return count;
}
