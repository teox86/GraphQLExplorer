import type { GovernanceConfig, IntrospectionSchemaModel, SchemaTypeRef } from '../types';
import { getSelectableFields, isLeafField } from '../schema/schema-utils';
import { getFieldDescription, getFieldFriendlyLabel, getFieldVisibility, isFieldHidden } from '../governance/resolve';

export interface FieldSearchMatch {
  path: string[];
  label: string;
  technicalName: string;
  description: string;
  isLeaf: boolean;
  deprecated: boolean;
}

export function searchFields(
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
  rootTypeRef: SchemaTypeRef,
  term: string,
  maxDepth: number,
  cap = 150,
): FieldSearchMatch[] {
  const results: FieldSearchMatch[] = [];
  const lowerTerm = term.toLowerCase();

  function walk(parentRef: SchemaTypeRef, ancestorPath: string[], ancestorTypes: string[], depth: number) {
    if (results.length >= cap || depth > maxDepth) return;
    for (const field of getSelectableFields(model, parentRef)) {
      const fieldPath = [...ancestorPath, field.name];
      const fieldPathStr = fieldPath.join('.');
      if (isFieldHidden(governance, fieldPathStr)) continue;

      const vis = getFieldVisibility(governance, fieldPathStr, field);
      const label = getFieldFriendlyLabel(governance, fieldPathStr, field);
      const description = getFieldDescription(governance, fieldPathStr, field);
      const leaf = isLeafField(model, field.type);

      const haystack = `${field.name} ${label} ${description}`.toLowerCase();
      if (vis !== 'technical' && haystack.includes(lowerTerm)) {
        results.push({ path: fieldPath, label, technicalName: field.name, description, isLeaf: leaf, deprecated: field.isDeprecated });
      }

      if (!leaf) {
        const namedType = field.type.name ?? field.type.ofType?.name ?? null;
        if (namedType && ancestorTypes.includes(namedType)) continue;
        walk(field.type, fieldPath, namedType ? [...ancestorTypes, namedType] : ancestorTypes, depth + 1);
      }
    }
  }

  walk(rootTypeRef, [], [], 0);
  return results;
}
