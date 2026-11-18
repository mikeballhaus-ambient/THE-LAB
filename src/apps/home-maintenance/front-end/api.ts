import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { AssetWithTasks, MaintenanceStatus, MaintenanceTask } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'HOME', init);
}

export const listAssets = (base: string): Promise<AssetWithTasks[]> =>
  request<{ assets: AssetWithTasks[] }>(base, '/api/home/assets').then((body) => body.assets ?? []);

/** Set task status; the server stamps `completedAt` for `done`. */
export const setTaskStatus = (
  base: string,
  taskId: number,
  status: MaintenanceStatus,
): Promise<MaintenanceTask> =>
  request<{ task: MaintenanceTask }>(base, `/api/home/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then((r) => r.task);

export const deleteAsset = (base: string, id: number): Promise<void> =>
  request(base, `/api/home/assets/${id}`, { method: 'DELETE' }).then(() => undefined);
