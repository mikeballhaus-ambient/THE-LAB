/** THE-LAB registry id for the Task List hybrid app. */
export const TASK_LIST_APP_REGISTRY_ID = 'app-lab-tasklist';

/** THE-LAB registry id for the CRM hybrid app (task_lists.app_id when CRM-owned). */
export const CRM_APP_REGISTRY_ID = 'app-lab-crm';

/** Scope for the standalone Task List app: lists with null/empty app_id. */
export const TASK_LIST_NATIVE_SCOPE: null = null;

/**
 * Host scope for Task List hybrid UI + `/api/task-lists` (not connector-only native null).
 * Includes legacy `app_id` null rows and integration-created `app-lab-tasklist` rows.
 */
export const TASK_LIST_UI_HOST_SCOPE = TASK_LIST_APP_REGISTRY_ID;

export type TaskListHostAppId = string | null;

export function normalizeTaskListAppId(raw: unknown): TaskListHostAppId {
  if (raw == null || raw === '') {
    return null;
  }
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/**
 * Whether a list row is visible under a connector/host scope.
 * Task List integration uses `app-lab-tasklist` header but native lists use NULL `app_id` — both match.
 */
export function listMatchesHostScope(
  listAppId: TaskListHostAppId,
  hostScope: TaskListHostAppId,
): boolean {
  const list = normalizeTaskListAppId(listAppId);
  const host = normalizeTaskListAppId(hostScope);
  if (host === null) {
    return list === null;
  }
  if (host === TASK_LIST_APP_REGISTRY_ID) {
    return list === null || list === TASK_LIST_APP_REGISTRY_ID;
  }
  return list === host;
}
