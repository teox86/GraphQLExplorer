import { computeBarHeights } from '../../results/chart-utils';

interface ResultChartProps {
  rows: Record<string, unknown>[];
  labelColumn: string;
  valueColumn: string;
}

export function ResultChart({ rows, labelColumn, valueColumn }: ResultChartProps) {
  const points = rows
    .map((r) => ({ label: String(r[labelColumn] ?? ''), value: Number(r[valueColumn]) }))
    .filter((p) => Number.isFinite(p.value))
    .slice(0, 40);

  if (points.length === 0) {
    return <p className="text-sm text-slate-400">No numeric data available to chart for this result shape.</p>;
  }

  const heights = computeBarHeights(points.map((p) => p.value));

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        {valueColumn} by {labelColumn}
      </p>
      <div className="flex h-48 items-stretch gap-1 border-b border-slate-200 pb-1">
        {points.map((p, i) => (
          // The column must have a definite height (h-full) so the bar's percentage
          // height resolves against it; justify-end anchors the bar to the baseline.
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${p.label}: ${p.value}`}>
            <div className="w-full rounded-t bg-slate-700 transition-all hover:bg-slate-900" style={{ height: `${heights[i]}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-slate-400">
        {points.map((p, i) => (
          <div key={i} className="flex-1 truncate text-center">
            {i % Math.max(Math.ceil(points.length / 10), 1) === 0 ? p.label.slice(0, 8) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
