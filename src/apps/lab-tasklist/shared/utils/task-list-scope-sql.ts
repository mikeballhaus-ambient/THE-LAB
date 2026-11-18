import type { TaskListHostAppId } from '../constants/app-scope';
import { normalizeTaskListAppId, TASK_LIST_APP_REGISTRY_ID } from '../constants/app-scope';

/** SQL fragment + params to filter task_lists by host app scope. */
export function taskListScopeWhere(
  hostScope: TaskListHostAppId,
  column = 'app_id',
): { clause: string; params: string[] } {
  const scope = normalizeTaskListAppId(hostScope);
  if (scope === null) {
    return {
      clause: ` AND (${column} IS NULL OR ${column} = '')`,
      params: [],
    };
  }
  if (scope === TASK_LIST_APP_REGISTRY_ID) {
    return {
      clause: ` AND (${column} IS NULL OR ${column} = '' OR ${column} = ?)`,
      params: [scope],
    };
  }
  return {
    clause: ` AND ${column} = ?`,
    params: [scope],
  };
}
