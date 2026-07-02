import type { ComplexityReport, ComplexityWarning, GovernanceConfig, IntrospectionSchemaModel, QueryConfiguration, SchemaTypeRef } from '../types';
import { getMaxDepth, getMaxSelectedFields, getRootQueryOverride } from '../governance/resolve';
import { findRootQueryField, getSelectableFields, isListType } from '../schema/schema-utils';
import { missingRequiredFieldArguments } from '../query-builder/field-arguments';

interface WalkResult {
  count: number;
  maxDepth: number;
  listCount: number;
  /** "field.path: argName" for every selected field missing a required argument value. */
  missingFieldArgs: string[];
}

function walkSelection(
  model: IntrospectionSchemaModel,
  governance: GovernanceConfig,
  parentTypeRef: SchemaTypeRef,
  selections: QueryConfiguration['selection'],
  currentDepth: number,
  pathPrefix: string[],
): WalkResult {
  const byName = new Map(getSelectableFields(model, parentTypeRef).map((f) => [f.name, f]));
  let count = 0;
  let maxDepth = currentDepth;
  let listCount = 0;
  const missingFieldArgs: string[] = [];

  for (const selection of selections) {
    const field = byName.get(selection.name);
    if (!field) continue;
    count += 1;
    if (isListType(field.type)) listCount += 1;

    const fieldPath = [...pathPrefix, selection.name];
    for (const argPath of missingRequiredFieldArguments(model, governance, field, fieldPath, selection.args)) {
      missingFieldArgs.push(`${fieldPath.join('.')}: ${argPath}`);
    }

    if (selection.children.length > 0) {
      const child = walkSelection(model, governance, field.type, selection.children, currentDepth + 1, fieldPath);
      count += child.count;
      maxDepth = Math.max(maxDepth, child.maxDepth);
      listCount += child.listCount;
      missingFieldArgs.push(...child.missingFieldArgs);
    }
  }

  return { count, maxDepth, listCount, missingFieldArgs };
}

/**
 * Heuristic, fully client-side complexity estimate. This is intentionally
 * simple (field count / depth / list nesting) rather than a true
 * cost-weighted analysis - it exists to catch obviously dangerous queries
 * before they hit the network. TODO: swap for a backend complexity-scoring
 * endpoint when one is available, keeping this same ComplexityReport shape.
 */
export function estimateComplexity(
  config: QueryConfiguration,
  model: IntrospectionSchemaModel | null,
  governance: GovernanceConfig,
): ComplexityReport {
  const warnings: ComplexityWarning[] = [];

  if (!config.rootFieldName || !model) {
    warnings.push({ code: 'NO_ROOT_QUERY', severity: 'hard', message: 'Select a root query before continuing.' });
    return {
      selectedFieldCount: 0,
      maxDepth: 0,
      listFieldCount: 0,
      hasTimeRange: false,
      missingRequiredFilters: [],
      warnings,
      blocksExecution: true,
    };
  }

  const rootField = findRootQueryField(model, config.rootFieldName);
  const rootOverride = getRootQueryOverride(governance, config.rootFieldName);

  const walk = rootField
    ? walkSelection(model, governance, rootField.type, config.selection, config.selection.length > 0 ? 1 : 0, [])
    : { count: 0, maxDepth: 0, listCount: 0, missingFieldArgs: [] };

  if (walk.count === 0) {
    warnings.push({ code: 'NO_FIELDS_SELECTED', severity: 'hard', message: 'Select at least one field to return.' });
  }

  if (walk.missingFieldArgs.length > 0) {
    warnings.push({
      code: 'MISSING_REQUIRED_FIELD_ARGUMENT',
      severity: 'hard',
      message: `Some selected fields are missing a required argument: ${walk.missingFieldArgs.join(', ')}. Set it on the field (Field Selection step) or declare a default in the governance config.`,
    });
  }

  const maxDepth = getMaxDepth(governance, config.rootFieldName);
  const maxFields = getMaxSelectedFields(governance, config.rootFieldName);

  if (walk.maxDepth > maxDepth) {
    warnings.push({
      code: 'MAX_DEPTH_EXCEEDED',
      severity: 'soft',
      message: `Selection nesting depth (${walk.maxDepth}) exceeds the recommended maximum of ${maxDepth}.`,
    });
  }

  if (walk.count > maxFields) {
    warnings.push({
      code: 'MAX_FIELDS_EXCEEDED',
      severity: 'soft',
      message: `Selected field count (${walk.count}) exceeds the recommended maximum of ${maxFields}.`,
    });
  }

  if (walk.listCount > governance.limits.warnListFieldNesting) {
    warnings.push({
      code: 'DEEP_LIST_NESTING',
      severity: 'soft',
      message: `Query selects ${walk.listCount} list fields, which can multiply result size quickly.`,
    });
  }

  const isTimeBased = rootOverride?.isTimeBased ?? false;
  const requiresTimeRange = rootOverride?.requiresTimeRange ?? false;
  const hasTimeRange = Boolean(config.timeRange && config.timeRange.start && config.timeRange.end);

  if (isTimeBased && requiresTimeRange && !hasTimeRange) {
    warnings.push({
      code: 'MISSING_TIME_RANGE',
      severity: 'hard',
      message: 'This query returns time-based data and requires a time range to run safely.',
    });
  }

  const missingRequiredFilters: string[] = [];
  for (const key of rootOverride?.requiredFilterDimensionKeys ?? []) {
    const hasFilter = config.dimensionFilters.some((f) => f.dimensionKey === key);
    if (!hasFilter) missingRequiredFilters.push(key);
  }
  if (missingRequiredFilters.length > 0) {
    const labels = missingRequiredFilters
      .map((key) => governance.dimensions.find((d) => d.key === key)?.label ?? key)
      .join(', ');
    warnings.push({
      code: 'MISSING_REQUIRED_FILTERS',
      severity: 'soft',
      message: `Recommended filters not set: ${labels}. The query may return an excessively large result.`,
    });
  }

  const hasHardWarning = warnings.some((w) => w.severity === 'hard');
  const hasUnoverriddenSoftWarning = warnings.some((w) => w.severity === 'soft') && !config.overrideWarnings;

  return {
    selectedFieldCount: walk.count,
    maxDepth: walk.maxDepth,
    listFieldCount: walk.listCount,
    hasTimeRange,
    missingRequiredFilters,
    warnings,
    blocksExecution: hasHardWarning || hasUnoverriddenSoftWarning,
  };
}
