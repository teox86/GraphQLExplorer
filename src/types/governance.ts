/**
 * Governance / configuration layer types.
 *
 * The GraphQL schema alone rarely carries enough business metadata to drive
 * a friendly UI (which fields are "recommended", which root queries are
 * expensive, how a time range argument is shaped, etc). This layer lets an
 * administrator supply that metadata locally, without requiring schema
 * changes on the server. Nothing here is required — every lookup falls back
 * to schema-derived defaults when no override exists.
 */

import type { TimeRangeArgumentMapping, TimeRangePreset } from './query';

/** A high-level "intent" bucket shown in wizard Step 2. */
export interface QueryCategory {
  id: string;
  label: string;
  description: string;
  /** Lucide-style icon name, purely cosmetic. */
  icon?: string;
  /**
   * How root queries are matched into this category when no explicit
   * `rootQueryOverrides[].categoryId` is set: matched by name/description
   * regex, by returning-type name pattern, or explicit list.
   */
  matchRootFieldNames?: string[];
  matchNamePattern?: string;
}

export type RootQueryTag =
  | 'time-based'
  | 'requires-date-range'
  | 'returns-list'
  | 'returns-kpi'
  | 'returns-report'
  | 'advanced'
  | 'expensive'
  | 'dimensional';

export interface RootQueryOverride {
  /** Must match a root Query field name in the schema. */
  fieldName: string;
  categoryId?: string;
  friendlyLabel?: string;
  friendlyDescription?: string;
  tags?: RootQueryTag[];
  hidden?: boolean;
  isTimeBased?: boolean;
  requiresTimeRange?: boolean;
  defaultTimeRangePreset?: TimeRangePreset;
  timeRangeMapping?: TimeRangeArgumentMapping;
  /** Dimension keys (from `dimensions`) applicable to this root query. */
  dimensionKeys?: string[];
  requiredFilterDimensionKeys?: string[];
  /** Dotted variable path where selected group-by dimension keys should be written, if the query supports grouping. */
  groupByArgumentPath?: string;
  /** Dotted variable path where the selected time bucket/granularity should be written. */
  timeBucketArgumentPath?: string;
  maxSelectableDepth?: number;
  maxSelectedFields?: number;
  recommendedUsage?: string;
}

export interface FieldOverride {
  /** Dotted path relative to the root query result, e.g. "site.line.equipment.name". */
  fieldPath: string;
  hidden?: boolean;
  internalOnly?: boolean;
  externallyExposable?: boolean;
  friendlyLabel?: string;
  description?: string;
  visibility?: 'recommended' | 'common' | 'advanced' | 'technical';
  expensive?: boolean;
}

/** A business dimension usable for filtering / grouping (Step 5). */
export interface DimensionConfig {
  key: string;
  label: string;
  description?: string;
  /** Parent dimension key, for hierarchical dimensions (Site > Area > Line > Equipment). */
  parentKey?: string | null;
  /**
   * GraphQL argument path this dimension maps to when used as a filter.
   * Omit for purely organizational/hierarchy levels that don't map to a
   * real argument on every query (e.g. a grouping level used only to
   * narrow down child options in the UI).
   */
  argumentPath?: string;
  /** If set, values are constrained to this enum type name in the schema. */
  enumTypeName?: string;
  supportsGroupBy?: boolean;
  supportsComparison?: boolean;
}

export interface KpiFamilyConfig {
  key: string;
  label: string;
  description?: string;
  kpiKeys: string[];
}

export interface KpiConfig {
  key: string;
  label: string;
  unit?: string;
  description?: string;
  familyKey: string;
}

export interface GovernanceConfig {
  categories: QueryCategory[];
  rootQueryOverrides: RootQueryOverride[];
  fieldOverrides: FieldOverride[];
  dimensions: DimensionConfig[];
  kpiFamilies: KpiFamilyConfig[];
  kpis: KpiConfig[];
  timeBuckets: { key: string; label: string }[];
  limits: {
    defaultMaxDepth: number;
    defaultMaxSelectedFields: number;
    warnListFieldNesting: number;
  };
}
