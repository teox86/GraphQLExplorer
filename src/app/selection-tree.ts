import type { FieldSelection, IntrospectionSchemaModel, SchemaTypeRef } from '../types';
import { getSelectableFields, isLeafField } from '../schema/schema-utils';

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

/** Counts total selected nodes (leaves + object nodes) in the tree. */
export function countSelectionNodes(tree: FieldSelection[]): number {
  let count = 0;
  for (const node of tree) {
    count += 1;
    count += countSelectionNodes(node.children);
  }
  return count;
}
