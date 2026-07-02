import type { FieldSelection, GovernanceConfig, IntrospectionSchemaModel, SchemaTypeRef } from '../types';
import { getSelectableFields, isLeafField } from '../schema/schema-utils';
import { getFieldVisibility, isFieldHidden } from '../governance/resolve';
import { toggleSelectionPath } from './selection-tree';

const VISIBILITY_RANK: Record<string, number> = { recommended: 0, common: 1, advanced: 2, technical: 3 };

/** A small, high-signal default selection: recommended fields first, then common scalars, capped and shallow. */
export function buildMinimalSelection(
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
  rootTypeRef: SchemaTypeRef,
  maxLeaves = 10,
): FieldSelection[] {
  let tree: FieldSelection[] = [];
  let count = 0;

  function collect(parentRef: SchemaTypeRef, ancestorPath: string[], depth: number) {
    if (count >= maxLeaves || depth > 3) return;
    const fields = getSelectableFields(model, parentRef)
      .filter((f) => !isFieldHidden(governance, [...ancestorPath, f.name].join('.')) && !f.isDeprecated)
      .map((f) => ({ f, vis: getFieldVisibility(governance, [...ancestorPath, f.name].join('.'), f) }))
      .filter(({ vis }) => vis !== 'technical')
      .sort((a, b) => VISIBILITY_RANK[a.vis] - VISIBILITY_RANK[b.vis]);

    for (const { f } of fields) {
      if (count >= maxLeaves) break;
      const path = [...ancestorPath, f.name];
      if (isLeafField(model, f.type)) {
        if (f.args.some((a) => a.isRequired)) continue; // skip fields needing arguments in auto-selection
        tree = toggleSelectionPath(tree, path);
        count += 1;
      } else if (depth < 2) {
        // Descend into object fields (common/advanced included) so result types made
        // entirely of nested objects - e.g. a KPI series wrapper - still yield a useful default.
        collect(f.type, path, depth + 1);
      }
    }
  }

  collect(rootTypeRef, [], 0);
  return tree;
}

/** Selects every non-hidden, non-technical field up to governance depth/field-count limits. */
export function buildAllVisibleSelection(
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
  rootTypeRef: SchemaTypeRef,
  maxDepth: number,
  maxFields: number,
): FieldSelection[] {
  let tree: FieldSelection[] = [];
  let count = 0;

  function collect(parentRef: SchemaTypeRef, ancestorPath: string[], ancestorTypes: string[], depth: number) {
    if (count >= maxFields || depth > maxDepth) return;
    const fields = getSelectableFields(model, parentRef).filter(
      (f) => !isFieldHidden(governance, [...ancestorPath, f.name].join('.')) && !f.isDeprecated,
    );

    for (const f of fields) {
      if (count >= maxFields) continue;
      const vis = getFieldVisibility(governance, [...ancestorPath, f.name].join('.'), f);
      if (vis === 'technical') continue;
      const path = [...ancestorPath, f.name];

      if (isLeafField(model, f.type)) {
        if (f.args.some((a) => a.isRequired)) continue; // skip fields needing arguments in auto-selection
        tree = toggleSelectionPath(tree, path);
        count += 1;
      } else {
        const namedType = f.type.name ?? f.type.ofType?.name ?? null;
        if (namedType && ancestorTypes.includes(namedType)) continue; // avoid circular expansion
        collect(f.type, path, namedType ? [...ancestorTypes, namedType] : ancestorTypes, depth + 1);
      }
    }
  }

  collect(rootTypeRef, [], [], 0);
  return tree;
}
