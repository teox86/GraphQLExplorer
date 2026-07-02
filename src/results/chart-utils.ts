/**
 * Maps values to bar-height percentages (3–100). Baselines at zero for
 * all-positive data so heights are proportional to value; for mixed-sign or
 * flat series it falls back to the value spread so bars stay visible.
 */
export function computeBarHeights(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const base = min >= 0 ? 0 : min;
  const range = max - base || Math.abs(max) || 1;
  return values.map((v) => Math.min(Math.max(((v - base) / range) * 100, 3), 100));
}
