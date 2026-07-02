import { describe, expect, it } from 'vitest';
import { parse } from 'graphql';
import { parseSchemaFromSdl } from '../schema/sdl-parser';
import { MOCK_SCHEMA_SDL } from '../config/mock-schema';
import { EXAMPLE_GOVERNANCE_CONFIG } from '../governance/example-config';
import { generateQuery } from '../query-builder';
import { buildVariables } from '../query-builder/build-variables';
import { renderSelectionSet } from '../query-builder/build-selection';
import { getRootQueryOverride } from '../governance/resolve';
import { findRootQueryField } from '../schema/schema-utils';
import type { FieldSelection, QueryConfiguration } from '../types';

const model = parseSchemaFromSdl(MOCK_SCHEMA_SDL).model!;
const governance = EXAMPLE_GOVERNANCE_CONFIG;

function baseKpiConfig(overrides: Partial<QueryConfiguration> = {}): QueryConfiguration {
  const rootOverride = getRootQueryOverride(governance, 'kpiReport')!;
  return {
    intentCategoryId: 'kpi',
    rootFieldName: 'kpiReport',
    operationName: 'KpiReportQuery',
    arguments: [],
    timeRange: {
      preset: 'custom',
      start: '2026-06-25T00:00:00.000Z',
      end: '2026-07-02T00:00:00.000Z',
      mapping: rootOverride.timeRangeMapping!,
    },
    dimensionFilters: [{ dimensionKey: 'kpi', operator: 'in', value: ['oee'] }],
    groupByDimensionKeys: ['line'],
    timeBucket: 'DAY',
    selection: [
      {
        name: 'series',
        children: [
          { name: 'kpiKey', children: [] },
          { name: 'points', children: [{ name: 'timestamp', children: [] }, { name: 'value', children: [] }] },
        ],
      },
    ],
    overrideWarnings: false,
    ...overrides,
  };
}

describe('buildVariables', () => {
  it('writes the time range into a nested input object per the governance mapping', () => {
    const vars = buildVariables(baseKpiConfig(), governance.dimensions, getRootQueryOverride(governance, 'kpiReport'));
    expect(vars).toMatchObject({
      input: {
        period: { from: '2026-06-25T00:00:00.000Z', to: '2026-07-02T00:00:00.000Z' },
        kpiKeys: ['oee'],
        groupBy: ['line'],
        granularity: 'DAY',
      },
    });
  });

  it('routes a dimension filter to its configured argument path', () => {
    const config = baseKpiConfig({ dimensionFilters: [{ dimensionKey: 'line', operator: 'eq', value: 'line-7' }] });
    const vars = buildVariables(config, governance.dimensions, getRootQueryOverride(governance, 'kpiReport')) as {
      input: { lineId?: string };
    };
    expect(vars.input.lineId).toBe('line-7');
  });

  it('ignores organizational-only dimensions with no argument path', () => {
    const config = baseKpiConfig({ dimensionFilters: [{ dimensionKey: 'area', operator: 'eq', value: 'area-1' }] });
    const vars = buildVariables(config, governance.dimensions, getRootQueryOverride(governance, 'kpiReport')) as {
      input: Record<string, unknown>;
    };
    expect(vars.input.areaId).toBeUndefined();
  });
});

describe('renderSelectionSet', () => {
  const rootField = findRootQueryField(model, 'kpiReport')!;

  it('skips object fields that have no selected sub-fields', () => {
    const selection: FieldSelection[] = [{ name: 'series', children: [] }];
    expect(renderSelectionSet(model, rootField.type, selection).trim()).toBe('');
  });

  it('de-duplicates repeated field selections', () => {
    const selection: FieldSelection[] = [
      { name: 'requestedPeriod', children: [{ name: 'from', children: [] }, { name: 'from', children: [] }] },
    ];
    const out = renderSelectionSet(model, rootField.type, selection);
    expect(out.match(/from/g)!.length).toBe(1);
  });

  it('drops fields that do not exist on the schema', () => {
    const selection: FieldSelection[] = [{ name: 'doesNotExist', children: [] }];
    expect(renderSelectionSet(model, rootField.type, selection).trim()).toBe('');
  });
});

describe('generateQuery (end-to-end)', () => {
  it('produces a document that is valid GraphQL', () => {
    const result = generateQuery(baseKpiConfig(), model, governance);
    expect(result.success).toBe(true);
    // Throws if the generated document is not syntactically valid GraphQL.
    expect(() => parse(result.query!.documentText)).not.toThrow();
  });

  it('declares the input variable and references it in the field arguments', () => {
    const result = generateQuery(baseKpiConfig(), model, governance);
    expect(result.query!.documentText).toContain('$input: KpiReportInput!');
    expect(result.query!.documentText).toContain('kpiReport(input: $input)');
  });

  it('emits the nested selection set', () => {
    const result = generateQuery(baseKpiConfig(), model, governance);
    const doc = result.query!.documentText;
    expect(doc).toContain('series');
    expect(doc).toContain('points');
    expect(doc).toContain('timestamp');
  });

  it('fails gracefully when no root field is selected', () => {
    const result = generateQuery(baseKpiConfig({ rootFieldName: null }), model, governance);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });
});
