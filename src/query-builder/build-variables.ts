import type { DimensionConfig, QueryConfiguration, RootQueryOverride } from '../types';
import { setPath } from './path-utils';
import { resolveTimeRange } from './time-range-resolver';

/**
 * Assembles the GraphQL `variables` object from the wizard's query
 * configuration. Every value is written through `setPath`, so a dotted
 * argument path such as "input.period.from" naturally becomes
 * `{ input: { period: { from: ... } } }`, while a flat path such as "id"
 * becomes a top-level variable `{ id: ... }`.
 */
export function buildVariables(
  config: QueryConfiguration,
  dimensions: DimensionConfig[],
  rootOverride: RootQueryOverride | null,
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const arg of config.arguments) {
    if (arg.value === undefined || arg.value === null || arg.value === '') continue;
    setPath(variables, arg.path, arg.value);
  }

  if (config.timeRange?.mapping) {
    const resolved = resolveTimeRange(config.timeRange);
    if (resolved.start) setPath(variables, resolved.mapping!.startPath, resolved.start);
    if (resolved.end) setPath(variables, resolved.mapping!.endPath, resolved.end);
  }

  const dimensionsByKey = new Map(dimensions.map((d) => [d.key, d]));
  for (const filter of config.dimensionFilters) {
    const dimension = dimensionsByKey.get(filter.dimensionKey);
    if (!dimension?.argumentPath) continue; // organizational-only dimensions don't map to a real argument
    setPath(variables, dimension.argumentPath, filter.value);
  }

  if (rootOverride?.groupByArgumentPath && config.groupByDimensionKeys.length > 0) {
    setPath(variables, rootOverride.groupByArgumentPath, config.groupByDimensionKeys);
  }

  if (rootOverride?.timeBucketArgumentPath && config.timeBucket) {
    setPath(variables, rootOverride.timeBucketArgumentPath, config.timeBucket);
  }

  return variables;
}
