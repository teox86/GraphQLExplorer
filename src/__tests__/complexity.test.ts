import { describe, expect, it } from 'vitest';
import { parseSchemaFromSdl } from '../schema/sdl-parser';
import { MOCK_SCHEMA_SDL } from '../config/mock-schema';
import { EXAMPLE_GOVERNANCE_CONFIG } from '../governance/example-config';
import { estimateComplexity } from '../complexity/estimate';
import { getRootQueryOverride } from '../governance/resolve';
import type { QueryConfiguration } from '../types';

const model = parseSchemaFromSdl(MOCK_SCHEMA_SDL).model!;
const governance = EXAMPLE_GOVERNANCE_CONFIG;

function kpiConfig(overrides: Partial<QueryConfiguration> = {}): QueryConfiguration {
  const rootOverride = getRootQueryOverride(governance, 'kpiReport')!;
  return {
    intentCategoryId: 'kpi',
    rootFieldName: 'kpiReport',
    operationName: 'KpiReportQuery',
    arguments: [],
    timeRange: { preset: 'last7d', start: '2026-06-25T00:00:00.000Z', end: '2026-07-02T00:00:00.000Z', mapping: rootOverride.timeRangeMapping! },
    dimensionFilters: [{ dimensionKey: 'kpi', operator: 'in', value: ['oee'] }],
    groupByDimensionKeys: [],
    timeBucket: 'DAY',
    selection: [{ name: 'series', children: [{ name: 'kpiKey', children: [] }] }],
    overrideWarnings: false,
    ...overrides,
  };
}

describe('estimateComplexity', () => {
  it('counts selected fields and nesting depth', () => {
    const report = estimateComplexity(kpiConfig(), model, governance);
    expect(report.selectedFieldCount).toBe(2); // series + kpiKey
    expect(report.maxDepth).toBe(2);
    expect(report.hasTimeRange).toBe(true);
  });

  it('hard-blocks execution when a required time range is missing', () => {
    const report = estimateComplexity(kpiConfig({ timeRange: null }), model, governance);
    const codes = report.warnings.map((w) => w.code);
    expect(codes).toContain('MISSING_TIME_RANGE');
    expect(report.warnings.find((w) => w.code === 'MISSING_TIME_RANGE')!.severity).toBe('hard');
    expect(report.blocksExecution).toBe(true);
  });

  it('hard-blocks execution when nothing is selected', () => {
    const report = estimateComplexity(kpiConfig({ selection: [] }), model, governance);
    expect(report.warnings.map((w) => w.code)).toContain('NO_FIELDS_SELECTED');
    expect(report.blocksExecution).toBe(true);
  });

  it('warns (soft) when a recommended required filter is missing', () => {
    const report = estimateComplexity(kpiConfig({ dimensionFilters: [] }), model, governance);
    expect(report.missingRequiredFilters).toContain('kpi');
    expect(report.warnings.find((w) => w.code === 'MISSING_REQUIRED_FILTERS')!.severity).toBe('soft');
  });

  it('lets an advanced user override soft warnings to unblock execution', () => {
    const blocked = estimateComplexity(kpiConfig({ dimensionFilters: [] }), model, governance);
    expect(blocked.blocksExecution).toBe(true); // soft warning present, not overridden
    const overridden = estimateComplexity(kpiConfig({ dimensionFilters: [], overrideWarnings: true }), model, governance);
    expect(overridden.blocksExecution).toBe(false);
  });

  it('blocks when there is no schema or root query', () => {
    const report = estimateComplexity(kpiConfig({ rootFieldName: null }), null, governance);
    expect(report.blocksExecution).toBe(true);
  });
});
