import type { FieldSelection, GovernanceConfig, IntrospectionSchemaModel, SchemaField, SchemaTypeRef } from '../types';
import { typeRefToString } from '../types';
import { getSelectableFields, isLeafField } from '../schema/schema-utils';
import { setPath } from './path-utils';
import { resolveEffectiveFieldArguments } from './field-arguments';
import type { VariableRegistry } from './variable-registry';

export interface RenderSelectionContext {
  governance: GovernanceConfig;
  registry: VariableRegistry;
}

/**
 * Builds the `(argName: $var, ...)` clause for a selected field, registering
 * one variable per top-level argument (nested input objects are reassembled
 * from their flattened leaf paths). Values come from the effective arguments
 * (user entries layered over governance defaults).
 */
function buildFieldArgumentClause(
  model: IntrospectionSchemaModel,
  ctx: RenderSelectionContext,
  field: SchemaField,
  fieldPath: string[],
  selection: FieldSelection,
): string {
  if (field.args.length === 0) return '';

  const effective = resolveEffectiveFieldArguments(model, ctx.governance, field, fieldPath, selection.args);
  if (effective.every((a) => !a.hasValue)) return '';

  // Reassemble flattened leaf values into a nested object per top-level argument.
  const argObjects: Record<string, unknown> = {};
  for (const arg of effective) {
    if (arg.hasValue) setPath(argObjects, arg.path, arg.value);
  }

  const clauses: string[] = [];
  for (const arg of field.args) {
    if (!(arg.name in argObjects)) continue;
    const varName = ctx.registry.add(`${fieldPath.join('_')}_${arg.name}`, typeRefToString(arg.type), argObjects[arg.name]);
    clauses.push(`${arg.name}: $${varName}`);
  }
  return clauses.length > 0 ? `(${clauses.join(', ')})` : '';
}

/**
 * Renders a GraphQL selection set from the user's chosen fields, walking the
 * schema in parallel so it can silently skip anything that would produce an
 * invalid document: object fields with no chosen sub-fields, and fields that
 * no longer exist on the current schema. Field arguments are emitted as
 * variables collected into `ctx.registry`.
 */
export function renderSelectionSet(
  model: IntrospectionSchemaModel,
  parentTypeRef: SchemaTypeRef,
  selections: FieldSelection[],
  ctx: RenderSelectionContext,
  pathPrefix: string[] = [],
): string {
  const availableFields = getSelectableFields(model, parentTypeRef);
  const availableByName = new Map(availableFields.map((f) => [f.name, f]));

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const selection of selections) {
    const key = selection.alias ?? selection.name;
    if (seen.has(key)) continue; // avoid duplicate field selections

    const schemaField = availableByName.get(selection.name);
    if (!schemaField) continue; // field no longer exists on this schema - skip defensively

    const fieldPath = [...pathPrefix, selection.name];
    const argClause = buildFieldArgumentClause(model, ctx, schemaField, fieldPath, selection);
    const printedName = (selection.alias ? `${selection.alias}: ${selection.name}` : selection.name) + argClause;

    if (isLeafField(model, schemaField.type)) {
      seen.add(key);
      parts.push(printedName);
      continue;
    }

    if (selection.children.length === 0) {
      // Object field without any chosen sub-field would be an invalid selection - skip it.
      continue;
    }

    const nested = renderSelectionSet(model, schemaField.type, selection.children, ctx, fieldPath);
    if (nested.trim().length === 0) continue;

    seen.add(key);
    parts.push(`${printedName} { ${nested} }`);
  }

  return parts.join(' ');
}
