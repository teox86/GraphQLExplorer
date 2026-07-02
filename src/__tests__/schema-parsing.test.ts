import { describe, expect, it } from 'vitest';
import { parseSchemaFromSdl } from '../schema/sdl-parser';
import { MOCK_SCHEMA_SDL } from '../config/mock-schema';
import { flattenArguments } from '../schema/flatten-arguments';
import { findRootQueryField, resolveNamedType } from '../schema/schema-utils';
import { unwrapType } from '../types';

const parsed = parseSchemaFromSdl(MOCK_SCHEMA_SDL);

describe('SDL parsing → internal schema model', () => {
  it('parses the bundled mock schema successfully', () => {
    expect(parsed.success).toBe(true);
    expect(parsed.model).toBeDefined();
  });

  it('exposes the root query fields', () => {
    const names = parsed.model!.queryFields.map((f) => f.name);
    expect(names).toContain('kpiReport');
    expect(names).toContain('productionHistory');
    expect(names).toContain('site');
  });

  it('detects required vs optional arguments', () => {
    const kpiReport = findRootQueryField(parsed.model!, 'kpiReport')!;
    const input = kpiReport.args.find((a) => a.name === 'input')!;
    expect(input.isRequired).toBe(true); // input: KpiReportInput!
  });

  it('unwraps list + non-null wrappers to the underlying named type', () => {
    const sites = findRootQueryField(parsed.model!, 'sites')!; // [Site!]!
    const { namedType, isList, isNonNull } = unwrapType(sites.type);
    expect(namedType).toBe('Site');
    expect(isList).toBe(true);
    expect(isNonNull).toBe(true);
  });

  it('preserves enum values', () => {
    const bucket = parsed.model!.types['TimeBucket'];
    expect(bucket.kind).toBe('ENUM');
    expect(bucket.enumValues.map((v) => v.name)).toEqual(['HOUR', 'DAY', 'WEEK', 'MONTH']);
  });
});

describe('flattenArguments', () => {
  it('flattens nested input-object arguments into dotted leaf paths', () => {
    const kpiReport = findRootQueryField(parsed.model!, 'kpiReport')!;
    const flat = flattenArguments(parsed.model!, kpiReport.args);
    const paths = flat.map((f) => f.path);
    expect(paths).toContain('input.period.from');
    expect(paths).toContain('input.period.to');
    expect(paths).toContain('input.kpiKeys');
    expect(paths).toContain('input.granularity');
    // period is an input object, so it must NOT appear as a leaf itself
    expect(paths).not.toContain('input.period');
  });

  it('resolves the KpiReportInput type as an INPUT_OBJECT', () => {
    const kpiReport = findRootQueryField(parsed.model!, 'kpiReport')!;
    const input = kpiReport.args.find((a) => a.name === 'input')!;
    const named = resolveNamedType(parsed.model!, input.type)!;
    expect(named.kind).toBe('INPUT_OBJECT');
  });
});
