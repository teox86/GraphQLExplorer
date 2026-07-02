import { describe, expect, it } from 'vitest';
import { findChartableData, findFirstArrayOfObjects, rowsToTable } from '../results/flatten';
import { rowsToCsv } from '../results/csv';
import { computeBarHeights } from '../results/chart-utils';

const kpiResult = {
  kpiReport: {
    series: [
      {
        kpiKey: 'oee',
        unit: '%',
        points: [
          { timestamp: '2026-06-25T00:00:00.000Z', value: 70 },
          { timestamp: '2026-06-26T00:00:00.000Z', value: 79 },
          { timestamp: '2026-06-27T00:00:00.000Z', value: 81 },
        ],
        summary: { average: 76.6 },
      },
    ],
  },
};

describe('findFirstArrayOfObjects', () => {
  it('locates the top-level series array for the table view', () => {
    const found = findFirstArrayOfObjects(kpiResult);
    expect(found!.path).toEqual(['kpiReport', 'series']);
    expect(found!.rows).toHaveLength(1);
  });
});

describe('findChartableData', () => {
  it('prefers the nested time-series (points) over the shallow series wrapper', () => {
    const chart = findChartableData(kpiResult)!;
    expect(chart).not.toBeNull();
    expect(chart.path).toEqual(['kpiReport', 'series', '0', 'points']);
    expect(chart.labelColumn).toBe('timestamp');
    expect(chart.valueColumn).toBe('value');
    expect(chart.rows).toHaveLength(3);
  });

  it('returns null when no numeric+label array exists', () => {
    expect(findChartableData({ a: { b: 'plain string' } })).toBeNull();
  });
});

describe('rowsToTable + rowsToCsv', () => {
  it('flattens nested objects into dotted columns', () => {
    const { columns } = rowsToTable(kpiResult.kpiReport.series);
    expect(columns).toContain('kpiKey');
    expect(columns).toContain('summary.average');
  });

  it('escapes CSV values containing commas and quotes', () => {
    const csv = rowsToCsv(['a', 'b'], [{ a: 'x,y', b: 'he said "hi"' }]);
    expect(csv.split('\n')[1]).toBe('"x,y","he said ""hi"""');
  });
});

describe('computeBarHeights', () => {
  it('scales all-positive values proportionally from a zero baseline', () => {
    const [a, b] = computeBarHeights([50, 100]);
    expect(b).toBe(100);
    expect(a).toBe(50);
  });

  it('keeps a flat series visible instead of collapsing to zero height', () => {
    // Regression test: equal values must not produce 0%-height (invisible) bars.
    const heights = computeBarHeights([75, 75, 75]);
    expect(heights.every((h) => h >= 3)).toBe(true);
  });

  it('never exceeds 100%', () => {
    expect(computeBarHeights([1, 2, 3, 4]).every((h) => h <= 100)).toBe(true);
  });
});
