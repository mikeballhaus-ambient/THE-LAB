/** Default Forms Builder app server port (see apps registry `app-lab-formsbuilder`). */
export const DEFAULT_FORMS_BUILDER_PORT = 3011;

/** Registry id for the Forms Builder hybrid app. */
export const FORMS_BUILDER_APP_ID = 'app-lab-formsbuilder';

export type FormsBuilderAppLike = {
  id: string;
  server?: { port?: number } | null;
  requiresPort?: number | null;
};

/**
 * Build Forms Builder API base URL. Prefer `explicit` when the platform passes a prop/env override.
 */
export function buildFormsBuilderUrl(
  apiBaseHost: string,
  port: number | string = DEFAULT_FORMS_BUILDER_PORT,
  explicit?: string,
): string {
  const trimmed = explicit?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  const host = apiBaseHost.replace(/\/$/, '');
  return `${host}:${port}`;
}

/**
 * Resolve Forms Builder URL from THE-LAB apps registry (server_config port on `app-lab-formsbuilder`).
 */
export function resolveFormsBuilderUrlFromApps(
  apps: ReadonlyArray<FormsBuilderAppLike>,
  apiBaseHost: string,
  explicit?: string,
): string {
  if (explicit?.trim()) {
    return buildFormsBuilderUrl(apiBaseHost, DEFAULT_FORMS_BUILDER_PORT, explicit);
  }
  const fb = apps.find((a) => a.id === FORMS_BUILDER_APP_ID);
  const port = fb?.server?.port ?? fb?.requiresPort ?? DEFAULT_FORMS_BUILDER_PORT;
  return buildFormsBuilderUrl(apiBaseHost, port);
}
