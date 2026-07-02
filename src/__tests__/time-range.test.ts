import { describe, expect, it } from 'vitest';
import { resolvePresetRange, resolveTimeRange } from '../query-builder/time-range-resolver';
import type { TimeRangeConfig } from '../types';

const FIXED_NOW = new Date('2026-07-02T12:00:00.000Z');

describe('resolvePresetRange', () => {
  it('resolves last24h to a 24h window ending now', () => {
    const { start, end } = resolvePresetRange('last24h', FIXED_NOW);
    expect(end).toBe(FIXED_NOW.toISOString());
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('resolves last7d to a 7-day window ending now', () => {
    const { start, end } = resolvePresetRange('last7d', FIXED_NOW);
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('resolves currentMonth to the first of the month', () => {
    const { start } = resolvePresetRange('currentMonth', FIXED_NOW);
    const startDate = new Date(start);
    expect(startDate.getDate()).toBe(1);
  });
});

describe('resolveTimeRange', () => {
  it('leaves an explicit custom range untouched', () => {
    const custom: TimeRangeConfig = {
      preset: 'custom',
      start: '2026-01-01T00:00:00.000Z',
      end: '2026-01-31T00:00:00.000Z',
      mapping: null,
    };
    expect(resolveTimeRange(custom)).toEqual(custom);
  });

  it('populates start/end for a preset range', () => {
    const range: TimeRangeConfig = { preset: 'last7d', start: null, end: null, mapping: null };
    const resolved = resolveTimeRange(range);
    expect(resolved.start).not.toBeNull();
    expect(resolved.end).not.toBeNull();
  });
});
