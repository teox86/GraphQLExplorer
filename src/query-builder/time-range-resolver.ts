import type { TimeRangeConfig, TimeRangePreset } from '../types';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export const TIME_RANGE_PRESET_LABELS: Record<TimeRangePreset, string> = {
  last24h: 'Last 24 hours',
  last7d: 'Last 7 days',
  last30d: 'Last 30 days',
  currentDay: 'Current day',
  currentWeek: 'Current week',
  currentMonth: 'Current month',
  custom: 'Custom range',
};

/**
 * Resolves a preset into concrete ISO 8601 bounds, evaluated at build time
 * (i.e. "last 24 hours" is computed relative to now, not stored statically).
 */
export function resolvePresetRange(preset: TimeRangePreset, now: Date = new Date()): { start: string; end: string } {
  switch (preset) {
    case 'last24h':
      return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), end: now.toISOString() };
    case 'last7d':
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: now.toISOString() };
    case 'last30d':
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: now.toISOString() };
    case 'currentDay':
      return { start: startOfDay(now).toISOString(), end: now.toISOString() };
    case 'currentWeek':
      return { start: startOfWeek(now).toISOString(), end: now.toISOString() };
    case 'currentMonth':
      return { start: startOfMonth(now).toISOString(), end: now.toISOString() };
    case 'custom':
      return { start: now.toISOString(), end: now.toISOString() };
    default:
      return { start: now.toISOString(), end: now.toISOString() };
  }
}

/** Returns a TimeRangeConfig with `start`/`end` populated from its preset (custom ranges are left untouched). */
export function resolveTimeRange(range: TimeRangeConfig): TimeRangeConfig {
  if (range.preset === 'custom') {
    return range;
  }
  const { start, end } = resolvePresetRange(range.preset);
  return { ...range, start, end };
}
