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

/** Best-effort guess at a numeric "value" column and a "label" column, for the simple chart view. */
export function guessChartColumns(columns: string[]): { labelColumn: string | null; valueColumn: string | null } {
  const valueColumn = columns.find((c) => /value|count|total|amount|avg|average|min|max|rate|percent/i.test(c)) ?? null;
  const labelColumn = columns.find((c) => /timestamp|date|time|label|name|key/i.test(c)) ?? null;
  return { labelColumn, valueColumn };
}
