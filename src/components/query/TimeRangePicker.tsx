import type { TimeRangeArgumentMapping, TimeRangeConfig, TimeRangePreset } from '../../types';
import { TIME_RANGE_PRESET_LABELS, resolvePresetRange } from '../../query-builder/time-range-resolver';
import { TextInput } from '../ui';

const PRESETS: TimeRangePreset[] = ['last24h', 'last7d', 'last30d', 'currentDay', 'currentWeek', 'currentMonth', 'custom'];

interface TimeRangePickerProps {
  value: TimeRangeConfig | null;
  mapping: TimeRangeArgumentMapping;
  onChange: (range: TimeRangeConfig) => void;
}

export function TimeRangePicker({ value, mapping, onChange }: TimeRangePickerProps) {
  const preset = value?.preset ?? null;

  function selectPreset(next: TimeRangePreset) {
    if (next === 'custom') {
      onChange({ preset: 'custom', start: value?.start ?? null, end: value?.end ?? null, mapping });
      return;
    }
    const resolved = resolvePresetRange(next);
    onChange({ preset: next, start: resolved.start, end: resolved.end, mapping });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectPreset(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
              preset === p ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {TIME_RANGE_PRESET_LABELS[p]}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="mt-3 flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">Start</label>
            <TextInput
              type="datetime-local"
              value={value?.start ? value.start.slice(0, 16) : ''}
              onChange={(v) => onChange({ preset: 'custom', start: v ? new Date(v).toISOString() : null, end: value?.end ?? null, mapping })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500">End</label>
            <TextInput
              type="datetime-local"
              value={value?.end ? value.end.slice(0, 16) : ''}
              onChange={(v) => onChange({ preset: 'custom', start: value?.start ?? null, end: v ? new Date(v).toISOString() : null, mapping })}
            />
          </div>
        </div>
      )}

      {preset && preset !== 'custom' && value?.start && value?.end && (
        <p className="mt-2 text-xs text-slate-400">
          {new Date(value.start).toLocaleString()} → {new Date(value.end).toLocaleString()}
        </p>
      )}
    </div>
  );
}
