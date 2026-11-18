/** Chart Builder REST version prefix — must match `front-end/utils/api-client.ts`. */
export const API_V1_PREFIX = '/api/v1';

/**
 * Register a route under both the bare path and the `/api/v1` versioned path,
 * attaching the API-version header to the versioned response.
 *
 * Older call sites here passed only a path; this keeps that shape working.
 */
export function withApiVersion(path: string): string {
  return path.startsWith(API_V1_PREFIX) ? path : `${API_V1_PREFIX}${path}`;
}

/** App-owned SQLite id (registry id minus the `app-` prefix). */
export const CHART_BUILDER_APP_ID = 'lab-chartbuilder';

/** Default listen port; must match the registry `server_config.port`. */
export const DEFAULT_CHART_BUILDER_PORT = 3013;
