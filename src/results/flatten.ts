/** Finds the first array-of-objects anywhere in a GraphQL result, for table/CSV/chart rendering. */
export function findFirstArrayOfObjects(data: unknown, path: string[] = []): { path: string[]; rows: Record<string, unknown>[] } | null {
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
      return { path, rows: data as Record<string, unknown>[] };
    }
    return null;
  }
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const found = findFirstArrayOfObjects(value, [...path, key]);
      if (found) return found;
    }
  }
  return null;
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

export function rowsToTable(rows: Record<string, unknown>[]): { columns: string[]; rows: Record<string, unknown>[] } {
  const flatRows = rows.map((r) => flattenObject(r));
  const columns = Array.from(new Set(flatRows.flatMap((r) => Object.keys(r))));
  return { columns, rows: flatRows };
}

/** Collects every array-of-objects in the result, each with its dotted path. */
export function findAllArraysOfObjects(
  data: unknown,
  path: string[] = [],
  acc: { path: string[]; rows: Record<string, unknown>[] }[] = [],
): { path: string[]; rows: Record<string, unknown>[] }[] {
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
      acc.push({ path, rows: data as Record<string, unknown>[] });
      // Recurse into the first element so nested arrays (e.g. series[].points) are found too.
      for (const [key, value] of Object.entries(data[0] as Record<string, unknown>)) {
        findAllArraysOfObjects(value, [...path, '0', key], acc);
      }
    }
    return acc;
  }
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      findAllArraysOfObjects(value, [...path, key], acc);
    }
  }
  return acc;
}

const VALUE_RE = /value|count|total|amount|avg|average|min|max|rate|percent|quantity|duration/i;
const LABEL_RE = /timestamp|date|time|label|name|key|bucket|period/i;

/** Best-effort guess at a numeric "value" column and a "label" column, for the simple chart view. */
export function guessChartColumns(columns: string[]): { labelColumn: string | null; valueColumn: string | null } {
  const valueColumn = columns.find((c) => VALUE_RE.test(c)) ?? null;
  const labelColumn = columns.find((c) => LABEL_RE.test(c)) ?? null;
  return { labelColumn, valueColumn };
}

/**
 * Picks the best array in the result for the chart view: the one that has
 * both a label-like and a numeric value-like column and the most rows
 * (so a nested `series[].points` time-series is preferred over the shallow
 * `series` wrapper, which only exposes summary scalars). Falls back to the
 * first array-of-objects if no strong candidate exists.
 */
export function findChartableData(
  data: unknown,
): { path: string[]; columns: string[]; rows: Record<string, unknown>[]; labelColumn: string; valueColumn: string } | null {
  const candidates = findAllArraysOfObjects(data).map((c) => {
    const table = rowsToTable(c.rows);
    const guess = guessChartColumns(table.columns);
    return { ...c, ...table, guess };
  });

  const usable = candidates.filter((c) => c.guess.labelColumn && c.guess.valueColumn && c.rows.some((r) => Number.isFinite(Number(r[c.guess.valueColumn!]))));
  if (usable.length === 0) return null;

  usable.sort((a, b) => b.rows.length - a.rows.length);
  const best = usable[0];
  return { path: best.path, columns: best.columns, rows: best.rows, labelColumn: best.guess.labelColumn!, valueColumn: best.guess.valueColumn! };
}
