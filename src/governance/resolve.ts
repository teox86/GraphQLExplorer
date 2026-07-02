import type {
  DimensionConfig,
  GovernanceConfig,
  IntrospectionSchemaModel,
  QueryCategory,
  RootQueryOverride,
  RootQueryTag,
  SchemaField,
} from '../types';

export interface ResolvedRootQuery {
  field: SchemaField;
  categoryId: string;
  label: string;
  description: string;
  tags: RootQueryTag[];
  hidden: boolean;
  override: RootQueryOverride | null;
}

export interface CategorizedRootQueries {
  category: QueryCategory;
  queries: ResolvedRootQuery[];
}

const OTHER_CATEGORY: QueryCategory = {
  id: 'other',
  label: 'Other',
  description: 'Root queries that have not been categorized in the governance configuration.',
};

export function getRootQueryOverride(config: GovernanceConfig, fieldName: string): RootQueryOverride | null {
  return config.rootQueryOverrides.find((o) => o.fieldName === fieldName) ?? null;
}

export function getFieldOverride(config: GovernanceConfig, fieldPath: string) {
  return config.fieldOverrides.find((o) => o.fieldPath === fieldPath) ?? null;
}

function humanizeFieldName(name: string): string {
  const withSpaces = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function resolveCategoryId(config: GovernanceConfig, fieldName: string, override: RootQueryOverride | null): string {
  if (override?.categoryId) return override.categoryId;
  for (const category of config.categories) {
    if (category.matchRootFieldNames?.includes(fieldName)) return category.id;
    if (category.matchNamePattern && new RegExp(category.matchNamePattern, 'i').test(fieldName)) {
      return category.id;
    }
  }
  return 'other';
}

export function resolveRootQuery(
  config: GovernanceConfig,
  field: SchemaField,
): ResolvedRootQuery {
  const override = getRootQueryOverride(config, field.name);
  return {
    field,
    categoryId: resolveCategoryId(config, field.name, override),
    label: override?.friendlyLabel ?? humanizeFieldName(field.name),
    description: override?.friendlyDescription ?? field.description ?? 'No description available.',
    tags: override?.tags ?? [],
    hidden: override?.hidden ?? false,
    override,
  };
}

/** Groups every root Query field into its resolved category, in category-declaration order. */
export function buildCategorizedRootQueries(
  config: GovernanceConfig,
  model: IntrospectionSchemaModel,
): CategorizedRootQueries[] {
  const resolved = model.queryFields.filter((f) => !f.name.startsWith('__')).map((f) => resolveRootQuery(config, f));

  const byCategory = new Map<string, ResolvedRootQuery[]>();
  for (const rq of resolved) {
    if (rq.hidden) continue;
    const list = byCategory.get(rq.categoryId) ?? [];
    list.push(rq);
    byCategory.set(rq.categoryId, list);
  }

  const orderedCategories = [...config.categories, OTHER_CATEGORY];
  return orderedCategories
    .filter((c) => byCategory.has(c.id))
    .map((category) => ({ category, queries: byCategory.get(category.id) ?? [] }));
}

export function getFieldVisibility(
  config: GovernanceConfig,
  fieldPath: string,
  field: SchemaField,
): 'recommended' | 'common' | 'advanced' | 'technical' {
  const override = getFieldOverride(config, fieldPath);
  if (override?.visibility) return override.visibility;
  if (field.isDeprecated) return 'technical';
  if (override?.internalOnly) return 'technical';
  if (/^_/.test(field.name) || field.name === 'id') return 'technical';
  return 'common';
}

export function getFieldFriendlyLabel(config: GovernanceConfig, fieldPath: string, field: SchemaField): string {
  const override = getFieldOverride(config, fieldPath);
  return override?.friendlyLabel ?? humanizeFieldName(field.name);
}

export function getFieldDescription(config: GovernanceConfig, fieldPath: string, field: SchemaField): string {
  const override = getFieldOverride(config, fieldPath);
  return override?.description ?? field.description ?? '';
}

export function isFieldHidden(config: GovernanceConfig, fieldPath: string): boolean {
  return getFieldOverride(config, fieldPath)?.hidden ?? false;
}

/**
 * Resolves the governance-declared default for a field argument, if any.
 * A default keyed to an exact `fieldPath` wins over a name-only default that
 * applies to every field. Returns `undefined` when nothing is declared.
 */
export function getFieldArgumentDefault(
  config: GovernanceConfig,
  fieldPath: string,
  argName: string,
): unknown {
  const defaults = config.fieldArgumentDefaults ?? [];
  const exact = defaults.find((d) => d.fieldPath === fieldPath && d.argName === argName);
  if (exact) return exact.value;
  const anyField = defaults.find((d) => d.fieldPath === undefined && d.argName === argName);
  return anyField ? anyField.value : undefined;
}

export function getDimensionsForRootQuery(config: GovernanceConfig, fieldName: string): DimensionConfig[] {
  const override = getRootQueryOverride(config, fieldName);
  if (!override?.dimensionKeys) return [];
  const keys = new Set(override.dimensionKeys);
  return config.dimensions.filter((d) => keys.has(d.key));
}

/** Builds a parent -> children map so the UI can render dimensions as a hierarchy (Site > Area > Line > Equipment). */
export function buildDimensionHierarchy(dimensions: DimensionConfig[]): Map<string | null, DimensionConfig[]> {
  const map = new Map<string | null, DimensionConfig[]>();
  for (const dim of dimensions) {
    const key = dim.parentKey ?? null;
    const list = map.get(key) ?? [];
    list.push(dim);
    map.set(key, list);
  }
  return map;
}

export function getMaxDepth(config: GovernanceConfig, fieldName: string): number {
  return getRootQueryOverride(config, fieldName)?.maxSelectableDepth ?? config.limits.defaultMaxDepth;
}

export function getMaxSelectedFields(config: GovernanceConfig, fieldName: string): number {
  return getRootQueryOverride(config, fieldName)?.maxSelectedFields ?? config.limits.defaultMaxSelectedFields;
}
