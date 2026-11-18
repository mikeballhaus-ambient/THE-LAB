import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { Charter, UpsertCharterInput } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'CHARTER', init);
}

export const listCharters = (base: string): Promise<Charter[]> =>
  request<{ charters: Charter[] }>(base, '/api/charter/charters').then((body) => body.charters ?? []);

export const createCharter = (base: string, input: UpsertCharterInput): Promise<Charter> =>
  request<{ charter: Charter }>(base, '/api/charter/charters', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.charter);

export const updateCharter = (
  base: string,
  id: number,
  input: UpsertCharterInput,
): Promise<Charter> =>
  request<{ charter: Charter }>(base, `/api/charter/charters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((r) => r.charter);

export const deleteCharter = (base: string, id: number): Promise<void> =>
  request(base, `/api/charter/charters/${id}`, { method: 'DELETE' }).then(() => undefined);
