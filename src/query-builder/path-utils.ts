/** Sets a value inside a plain object using a dotted path, creating intermediate objects as needed. */
export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) return;
  let current: Record<string, unknown> = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const existing = current[segment];
    if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

/** First path segment - by convention this is the GraphQL variable / root argument name. */
export function rootSegment(path: string): string {
  return path.split('.')[0];
}
