/**
 * Exact match or single trailing `.*` on the pattern (rules + workflows v1).
 */
export function eventTypeMatches(pattern: string, actual: string): boolean {
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return actual === prefix || actual.startsWith(`${prefix}.`);
  }
  return pattern === actual;
}
