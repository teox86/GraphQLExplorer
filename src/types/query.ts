/**
 * Types describing the query the user is building through the wizard, and
 * the artifacts (variables, generated document) produced from it.
 */

export type ArgumentValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'date'
  | 'datetime'
  | 'date-range'
  | 'multi-select'
  | 'json'
  | 'unknown';

/** A concrete value the user entered for one root-query argument. */
export interface ArgumentValue {
  argName: string;
  /** Dotted path for nested input-object arguments, e.g. "input.period.from". */
  path: string;
  kind: ArgumentValueKind;
  value: unknown;
}

/** One node in the selected field tree. Mirrors the schema tree but only for chosen fields. */
export interface FieldSelection {
  /** Field name as it appears in the schema. */
  name: string;
  /** Optional alias (not required for v1, but modeled for forward compatibility). */
  alias?: string;
  /** Nested selections, present when the field resolves to an object/interface/union type. */
  children: FieldSelection[];
  /** Arguments applied directly to this field (rare, but supported e.g. pagination on nested lists). */
  args?: ArgumentValue[];
}

export type TimeRangePreset =
  | 'last24h'
  | 'last7d'
  | 'last30d'
  | 'currentDay'
  | 'currentWeek'
  | 'currentMonth'
  | 'custom';

/** Where the resolved time range values should be written into the GraphQL variables. */
export interface TimeRangeArgumentMapping {
  /** Dotted variable path for the start bound, e.g. "from", "input.period.from". */
  startPath: string;
  /** Dotted variable path for the end bound, e.g. "to", "input.period.to". */
  endPath: string;
  /** Whether the mapping targets a single "dateRange" input object instead of two scalars. */
  style: 'two-arguments' | 'nested-input';
}

export interface TimeRangeConfig {
  preset: TimeRangePreset;
  /** ISO 8601 date or datetime strings, always resolved even for presets (computed at build time). */
  start: string | null;
  end: string | null;
  mapping: TimeRangeArgumentMapping | null;
}

export type FilterOperator = 'eq' | 'in' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'neq';

export interface DimensionFilterValue {
  dimensionKey: string;
  operator: FilterOperator;
  value: unknown;
}

export interface QueryConfiguration {
  /** id of the QueryCategory chosen in step 2. */
  intentCategoryId: string | null;
  /** Name of the selected root Query field. */
  rootFieldName: string | null;
  operationName: string;
  arguments: ArgumentValue[];
  timeRange: TimeRangeConfig | null;
  dimensionFilters: DimensionFilterValue[];
  groupByDimensionKeys: string[];
  timeBucket: string | null;
  selection: FieldSelection[];
  /** User acknowledged soft warnings and wants to proceed anyway. */
  overrideWarnings: boolean;
}

export interface QueryVariable {
  name: string;
  graphQLType: string;
  value: unknown;
}

export interface GeneratedQuery {
  documentText: string;
  variables: Record<string, unknown>;
  operationName: string;
}
