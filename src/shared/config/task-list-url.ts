/** Default Task List app server port (see apps registry `app-lab-tasklist`). */
export const DEFAULT_TASK_LIST_PORT = 3005;

/** Registry id for the Task List hybrid app. */
export const TASK_LIST_APP_ID = 'app-lab-tasklist';

export type TaskListAppLike = {
  id: string;
  server?: { port?: number } | null;
  requiresPort?: number | null;
};

export function buildTaskListUrl(
  apiBaseHost: string,
  port: number | string = DEFAULT_TASK_LIST_PORT,
  explicit?: string,
): string {
  const trimmed = explicit?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  const host = apiBaseHost.replace(/\/$/, '');
  return `${host}:${port}`;
}

/** Resolve Task List API base URL from THE-LAB apps registry (`app-lab-tasklist`). */
export function resolveTaskListUrlFromApps(
  apps: ReadonlyArray<TaskListAppLike>,
  apiBaseHost: string,
  explicit?: string,
): string {
  if (explicit?.trim()) {
    return buildTaskListUrl(apiBaseHost, DEFAULT_TASK_LIST_PORT, explicit);
  }
  const tl = apps.find((a) => a.id === TASK_LIST_APP_ID);
  const port = tl?.server?.port ?? tl?.requiresPort ?? DEFAULT_TASK_LIST_PORT;
  return buildTaskListUrl(apiBaseHost, port);
}
