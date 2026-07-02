import type { FieldSelection, IntrospectionSchemaModel, SchemaTypeRef } from '../types';
import { getSelectableFields, isLeafField } from '../schema/schema-utils';

/**
 * Renders a GraphQL selection set from the user's chosen fields, walking the
 * schema in parallel so it can silently skip anything that would produce an
 * invalid document: object fields with no chosen sub-fields, and fields that
 * no longer exist on the current schema (e.g. a saved template loaded
 * against a slightly different schema version).
 */
export function renderSelectionSet(
  model: IntrospectionSchemaModel,
  parentTypeRef: SchemaTypeRef,
  selections: FieldSelection[],
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

    const printedName = selection.alias ? `${selection.alias}: ${selection.name}` : selection.name;

    if (isLeafField(model, schemaField.type)) {
      seen.add(key);
      parts.push(printedName);
      continue;
    }

    if (selection.children.length === 0) {
      // Object field without any chosen sub-field would be an invalid selection - skip it.
      continue;
    }

    const nested = renderSelectionSet(model, schemaField.type, selection.children);
    if (nested.trim().length === 0) continue;

    seen.add(key);
    parts.push(`${printedName} { ${nested} }`);
  }

  return parts.join(' ');
}
