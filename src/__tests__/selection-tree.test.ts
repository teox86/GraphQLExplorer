import { describe, expect, it } from 'vitest';
import {
  buildObjectDefaultBranch,
  isPathSelected,
  resolveTypeRefAtPath,
  setSelectionBranch,
  toggleSelectionPath,
} from '../app/selection-tree';
import { parseSchemaFromSdl } from '../schema/sdl-parser';
import { MOCK_SCHEMA_SDL } from '../config/mock-schema';
import { EXAMPLE_GOVERNANCE_CONFIG } from '../governance/example-config';
import { findRootQueryField, resolveNamedType } from '../schema/schema-utils';
import type { FieldSelection } from '../types';

const model = parseSchemaFromSdl(MOCK_SCHEMA_SDL).model!;
const governance = EXAMPLE_GOVERNANCE_CONFIG;
const kpiReport = findRootQueryField(model, 'kpiReport')!;

describe('toggleSelectionPath nesting (regression for the field-tree checkbox bug)', () => {
  it('stores a nested leaf as a direct child of its parent node, not at the root', () => {
    // Select kpiReport → series → kpiKey
    const tree = toggleSelectionPath([], ['series', 'kpiKey']);
    // The parent "series" is the only root-level node...
    expect(tree.map((n) => n.name)).toEqual(['series']);
    // ...and "kpiKey" lives under it, so a sibling-level lookup at the child depth finds it.
    const series = tree.find((n) => n.name === 'series')!;
    expect(series.children.some((c) => c.name === 'kpiKey')).toBe(true);
    // The bug was checking isPathSelected(localSiblings, fullPath); the correct checks:
    expect(isPathSelected(tree, ['series', 'kpiKey'])).toBe(true); // full tree + full path
    expect(isPathSelected(series.children, ['kpiKey'])).toBe(true); // local siblings + local name
  });
});

describe('setSelectionBranch', () => {
  it('sets a node with explicit children at the root', () => {
    const branch: FieldSelection = { name: 'series', children: [{ name: 'kpiKey', children: [] }] };
    const tree = setSelectionBranch([], ['series'], branch);
    expect(tree).toEqual([branch]);
  });

  it('creates intermediate parents when setting a deep branch', () => {
    const branch: FieldSelection = { name: 'points', children: [{ name: 'value', children: [] }] };
    const tree = setSelectionBranch([], ['series', 'points'], branch);
    expect(tree[0].name).toBe('series');
    expect(tree[0].children[0]).toEqual(branch);
  });

  it('removes a node when branch is null', () => {
    const start = setSelectionBranch([], ['series'], { name: 'series', children: [{ name: 'kpiKey', children: [] }] });
    expect(setSelectionBranch(start, ['series'], null)).toEqual([]);
  });

  it('is a no-op when removing a node that does not exist', () => {
    const start: FieldSelection[] = [{ name: 'series', children: [] }];
    expect(setSelectionBranch(start, ['missing'], null)).toEqual(start);
  });
});

describe('resolveTypeRefAtPath', () => {
  it('resolves a nested object path to its named type', () => {
    const ref = resolveTypeRefAtPath(model, kpiReport.type, ['series', 'points'])!;
    expect(resolveNamedType(model, ref)!.name).toBe('KpiPoint');
  });

  it('returns null for a path that does not exist', () => {
    expect(resolveTypeRefAtPath(model, kpiReport.type, ['series', 'nope'])).toBeNull();
  });
});

describe('buildObjectDefaultBranch', () => {
  it('selects an object together with its direct scalar/enum leaf fields only', () => {
    const branch = buildObjectDefaultBranch(model, governance, kpiReport.type, ['series'])!;
    expect(branch.name).toBe('series');
    const childNames = branch.children.map((c) => c.name).sort();
    // KpiSeries leaves: kpiKey, kpiLabel, unit. Nested objects (points, summary) are excluded.
    expect(childNames).toEqual(['kpiKey', 'kpiLabel', 'unit']);
    expect(childNames).not.toContain('points');
  });

  it('returns null for an object with no directly selectable leaves', () => {
    // KpiReportResult.series is a list of objects; the result object itself (root) has
    // requestedPeriod (object) and series (object) - resolve a path with only object children.
    const branch = buildObjectDefaultBranch(model, governance, kpiReport.type, []);
    expect(branch).toBeNull(); // empty path is not a selectable object
  });
});
