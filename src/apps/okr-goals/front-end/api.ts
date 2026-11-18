import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { KeyResult, ObjectiveWithKeyResults, UpdateKeyResultInput } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'OKR', init);
}

export const listObjectives = (base: string): Promise<ObjectiveWithKeyResults[]> =>
  request<{ objectives: ObjectiveWithKeyResults[] }>(base, '/api/okr/objectives').then(
    (body) => body.objectives ?? [],
  );

/** Update a key result's current value (progress is derived server-side). */
export const updateKeyResult = (
  base: string,
  id: number,
  input: UpdateKeyResultInput,
): Promise<KeyResult> =>
  request<{ keyResult: KeyResult }>(base, `/api/okr/key-results/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((r) => r.keyResult);

export const deleteObjective = (base: string, id: number): Promise<void> =>
  request(base, `/api/okr/objectives/${id}`, { method: 'DELETE' }).then(() => undefined);
