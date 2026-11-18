import { AppDatabaseServiceProxy } from '../../../db/app-db-service';
import { taskListScopeWhere } from '../../../shared/utils/task-list-scope-sql';

export async function getTaskListIdForTask(taskId: number): Promise<number | undefined> {
  const db = AppDatabaseServiceProxy.getInstance();
  const result = await db.select({
    sql: 'SELECT task_list_id FROM task_list_tasks WHERE task_id = ? LIMIT 1',
    params: [taskId],
  });
  const first = result.rows[0] as Record<string, unknown> | undefined;
  const raw = first?.task_list_id;
  if (raw == null) {
    return undefined;
  }
  return Number(raw);
}

export async function listAllTaskListIds(): Promise<Array<{ id: number; name: string }>> {
  const db = AppDatabaseServiceProxy.getInstance();
  const scope = taskListScopeWhere(null);
  const result = await db.select({
    sql: `SELECT id, name FROM task_lists WHERE 1=1${scope.clause} ORDER BY name ASC`,
    params: [...scope.params],
  });
  return result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: Number(r.id),
      name: String(r.name ?? ''),
    };
  });
}
