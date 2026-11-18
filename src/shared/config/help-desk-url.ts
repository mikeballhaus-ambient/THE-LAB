export const DEFAULT_HELP_DESK_PORT = 3012;

export const HELP_DESK_APP_ID = 'app-lab-helpdesk';

export type HelpDeskAppLike = {
  id: string;
  server?: { port?: number } | null;
  requiresPort?: number | null;
};

export function buildHelpDeskUrl(
  apiBaseHost: string,
  port: number | string = DEFAULT_HELP_DESK_PORT,
  explicit?: string,
): string {
  const trimmed = explicit?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  const host = apiBaseHost.replace(/\/$/, '');
  return `${host}:${port}`;
}

export function resolveHelpDeskUrlFromApps(
  apps: ReadonlyArray<HelpDeskAppLike>,
  apiBaseHost: string,
  explicit?: string,
): string {
  if (explicit?.trim()) {
    return buildHelpDeskUrl(apiBaseHost, DEFAULT_HELP_DESK_PORT, explicit);
  }
  const app = apps.find((a) => a.id === HELP_DESK_APP_ID);
  const port = app?.server?.port ?? app?.requiresPort ?? DEFAULT_HELP_DESK_PORT;
  return buildHelpDeskUrl(apiBaseHost, port);
}
