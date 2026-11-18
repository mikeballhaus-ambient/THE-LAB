import type { ChartFilterSpec } from '@/shared/charts/chart-data-mapping';

/**
 * Filter plumbing for connector-backed charts.
 *
 * A chart may declare `allowedFilters` — context keys the host passes at render time and
 * that the app maps onto query params. Some filters are `required` (e.g. `taskListId` for a
 * nested Task List entity). A strict `getAll` call that does **not** name that key must not
 * forward the filter, or every read would fail on an unused required param.
 */

/**
 * Decide which filter specs a `getAll` call may forward.
 *
 * Contract pinned by `src/tests/apps/lab-chartbuilder/.../chart-connector-data-filters.test.ts`:
 *   - required filter, `getAll` has no filter           → dropped (`[]`)
 *   - required filter, `getAll` explicitly names it     → kept
 */
export function resolveAllowedFiltersForGetAll(
  specs: readonly ChartFilterSpec[] | undefined,
  getAllFilterKey: string | undefined,
): ChartFilterSpec[] {
  if (!specs || specs.length === 0) {
    return [];
  }
  const key = (getAllFilterKey ?? '').trim();
  if (!key) {
    return [];
  }
  return specs.filter((spec) => !spec.required || spec.contextKey === key);
}

/** Build the query params for a connector call from declared filters + host context. */
export function buildFilterParams(
  specs: readonly ChartFilterSpec[] | undefined,
  context: Record<string, unknown> | undefined,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (!specs || !context) {
    return params;
  }
  for (const spec of specs) {
    const raw = context[spec.contextKey];
    if (raw === undefined || raw === null || raw === '') {
      continue;
    }
    params[spec.targetParam] = String(raw);
  }
  return params;
}

/** Append filter params to a URL that may already have a query string. */
export function withFilterParams(url: string, params: Record<string, string>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return url;
  }
  const search = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${url}${url.includes('?') ? '&' : '?'}${search}`;
}
