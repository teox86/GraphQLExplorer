import { describe, expect, it } from 'vitest';
import { parse } from 'graphql';
import { parseSchemaFromSdl } from '../schema/sdl-parser';
import { MOCK_SCHEMA_SDL } from '../config/mock-schema';
import { EXAMPLE_GOVERNANCE_CONFIG } from '../governance/example-config';
import { generateQuery } from '../query-builder';
import { missingRequiredFieldArguments, resolveEffectiveFieldArguments } from '../query-builder/field-arguments';
import { estimateComplexity } from '../complexity/estimate';
import { getRootQueryOverride } from '../governance/resolve';
import { findRootQueryField, getSelectableFields } from '../schema/schema-utils';
import type { QueryConfiguration } from '../types';

const model = parseSchemaFromSdl(MOCK_SCHEMA_SDL).model!;
const governance = EXAMPLE_GOVERNANCE_CONFIG;
const kpiReport = findRootQueryField(model, 'kpiReport')!;
const kpiSeriesType = getSelectableFields(model, kpiReport.type).find((f) => f.name === 'series')!.type;
const localizedLabel = getSelectableFields(model, kpiSeriesType).find((f) => f.name === 'localizedLabel')!;

/** A config selecting kpiReport → series → localizedLabel (which requires a `lang` argument). */
function configWithLocalizedLabel(langValue?: string): QueryConfiguration {
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
    selection: [
      {
        name: 'series',
        children: [
          { name: 'kpiKey', children: [] },
          {
            name: 'localizedLabel',
            children: [],
            args: langValue !== undefined ? [{ argName: 'lang', path: 'lang', kind: 'string', value: langValue }] : undefined,
          },
        ],
      },
    ],
    overrideWarnings: false,
  };
}

describe('resolveEffectiveFieldArguments', () => {
  it('falls back to the governance default when no value is entered', () => {
    const effective = resolveEffectiveFieldArguments(model, governance, localizedLabel, ['series', 'localizedLabel'], undefined);
    const lang = effective.find((a) => a.path === 'lang')!;
    expect(lang.value).toBe('en'); // from fieldArgumentDefaults
    expect(lang.isRequired).toBe(true);
    expect(lang.hasValue).toBe(true);
  });

  it('prefers an explicitly entered value over the default', () => {
    const args = [{ argName: 'lang', path: 'lang', kind: 'string' as const, value: 'fr' }];
    const effective = resolveEffectiveFieldArguments(model, governance, localizedLabel, ['series', 'localizedLabel'], args);
    expect(effective.find((a) => a.path === 'lang')!.value).toBe('fr');
  });

  it('reports a missing required argument when there is no value and no default', () => {
    const bareGovernance = { ...governance, fieldArgumentDefaults: [] };
    const missing = missingRequiredFieldArguments(model, bareGovernance, localizedLabel, ['series', 'localizedLabel'], undefined);
    expect(missing).toEqual(['lang']);
  });
});

describe('generateQuery with nested field arguments', () => {
  it('emits the field argument as a declared variable and references it on the field', () => {
    const result = generateQuery(configWithLocalizedLabel('fr'), model, governance);
    expect(result.success).toBe(true);
    const doc = result.query!.documentText;
    // A dedicated variable is declared and passed to the nested field.
    expect(doc).toMatch(/localizedLabel\(lang: \$[A-Za-z0-9_]+\)/);
    expect(() => parse(doc)).not.toThrow();
    // The entered value is carried in variables.
    expect(Object.values(result.query!.variables)).toContain('fr');
  });

  it('applies the governance default when the user did not enter a value', () => {
    const result = generateQuery(configWithLocalizedLabel(undefined), model, governance);
    expect(result.success).toBe(true);
    expect(Object.values(result.query!.variables)).toContain('en'); // default lang
    expect(result.query!.documentText).toMatch(/localizedLabel\(lang: \$/);
  });

  it('omits the argument clause and does not block when a required arg is unset with no default', () => {
    const bareGovernance = { ...governance, fieldArgumentDefaults: [] };
    const result = generateQuery(configWithLocalizedLabel(undefined), model, bareGovernance);
    // Query still generates (valid syntax) but without the missing argument...
    expect(result.success).toBe(true);
    expect(result.query!.documentText).not.toMatch(/localizedLabel\(/);
    // ...and the complexity checker hard-blocks execution so the user is warned.
    const report = estimateComplexity(configWithLocalizedLabel(undefined), model, bareGovernance);
    expect(report.warnings.some((w) => w.code === 'MISSING_REQUIRED_FIELD_ARGUMENT' && w.severity === 'hard')).toBe(true);
    expect(report.blocksExecution).toBe(true);
  });

  it('does not block when the governance default satisfies the required arg', () => {
    const report = estimateComplexity(configWithLocalizedLabel(undefined), model, governance);
    expect(report.warnings.some((w) => w.code === 'MISSING_REQUIRED_FIELD_ARGUMENT')).toBe(false);
  });
});
