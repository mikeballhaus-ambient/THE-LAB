import { CRM_APP_REGISTRY_ID } from '@/apps/lab-tasklist/shared/constants/app-scope';
import type { Task } from '@/apps/lab-tasklist/shared/types/task.types';
import type { TaskListWithTasks } from '@/apps/lab-tasklist/shared/types/task.types';
import { getLabUserHeaders, labAppFetch } from '@/shared/composables/useLabUserHeaders';

const CRM_DEFAULT_LIST_NAME = 'CRM Tasks';

export interface CrmTasksApi {
  ensureDefaultTaskListId: () => Promise<number>;
  fetchScopedLists: () => Promise<TaskListWithTasks[]>;
  fetchScopedTasks: () => Promise<Task[]>;
  fetchTasksForEntity: (entityKey: string, recordId: number) => Promise<Task[]>;
}

export function useCrmTasksApi(taskListServerUrl: string): CrmTasksApi {
  const base = taskListServerUrl.replace(/\/$/, '');
  const appId = CRM_APP_REGISTRY_ID;

  async function fetchScopedLists(): Promise<TaskListWithTasks[]> {
    const response = await labAppFetch(
      `${base}/api/app-scoped/task-lists?appId=${encodeURIComponent(appId)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to load CRM task lists (${response.status})`);
    }
    const body = (await response.json()) as {
      success: boolean;
      data?: { lists: TaskListWithTasks[] };
    };
    return body.data?.lists ?? [];
  }

  async function fetchTasksForEntity(entityKey: string, recordId: number): Promise<Task[]> {
    const params = new URLSearchParams({
      appId,
      entityKey,
      recordId: String(recordId),
    });
    const response = await labAppFetch(`${base}/api/app-scoped/tasks?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to load tasks for record (${response.status})`);
    }
    const body = (await response.json()) as { success: boolean; data?: Task[] };
    return body.data ?? [];
  }

  async function fetchScopedTasks(): Promise<Task[]> {
    const response = await labAppFetch(
      `${base}/api/app-scoped/tasks?appId=${encodeURIComponent(appId)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to load CRM tasks (${response.status})`);
    }
    const body = (await response.json()) as { success: boolean; data?: Task[] };
    return body.data ?? [];
  }

  async function ensureDefaultTaskListId(): Promise<number> {
    const lists = await fetchScopedLists();
    if (lists.length > 0) {
      return lists[0].id;
    }
    const response = await labAppFetch(`${base}/api/app-scoped/task-lists`, {
      method: 'POST',
      headers: getLabUserHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        appId,
        name: CRM_DEFAULT_LIST_NAME,
        description: 'Default task list for CRM',
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to create default CRM task list (${response.status})`);
    }
    const body = (await response.json()) as { success: boolean; data?: { id: number } };
    if (!body.success || body.data?.id == null) {
      throw new Error('Failed to create default CRM task list');
    }
    return body.data.id;
  }

  return {
    ensureDefaultTaskListId,
    fetchScopedLists,
    fetchScopedTasks,
    fetchTasksForEntity,
  };
}
