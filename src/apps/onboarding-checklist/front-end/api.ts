import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { ChecklistTask, ChecklistWithTasks, TaskStatus } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'ONBOARDING', init);
}

export const listChecklists = (base: string): Promise<ChecklistWithTasks[]> =>
  request<{ checklists: ChecklistWithTasks[] }>(base, '/api/onboarding').then(
    (body) => body.checklists ?? [],
  );

/** Update task status (inline advance); the server may publish onboarding events. */
export const setTaskStatus = (
  base: string,
  taskId: number,
  status: TaskStatus,
): Promise<ChecklistTask> =>
  request<{ task: ChecklistTask }>(base, `/api/onboarding-tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then((r) => r.task);

export const deleteChecklist = (base: string, id: number): Promise<void> =>
  request(base, `/api/onboarding/${id}`, { method: 'DELETE' }).then(() => undefined);
