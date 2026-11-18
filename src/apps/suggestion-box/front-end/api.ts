import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { Suggestion, UpsertSuggestionInput } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'SUGGESTION', init);
}

export const listSuggestions = (base: string): Promise<Suggestion[]> =>
  request<{ suggestions: Suggestion[] }>(base, '/api/suggestions').then(
    (body) => body.suggestions ?? [],
  );

export const createSuggestion = (
  base: string,
  input: UpsertSuggestionInput,
): Promise<Suggestion> =>
  request<{ suggestion: Suggestion }>(base, '/api/suggestions', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.suggestion);

export const updateSuggestion = (
  base: string,
  id: number,
  input: UpsertSuggestionInput,
): Promise<Suggestion> =>
  request<{ suggestion: Suggestion }>(base, `/api/suggestions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((r) => r.suggestion);

/** Upvote (+1) or downvote (-1). */
export const voteSuggestion = (base: string, id: number, delta: number): Promise<Suggestion> =>
  request<{ suggestion: Suggestion }>(base, `/api/suggestions/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ delta }),
  }).then((r) => r.suggestion);

export const deleteSuggestion = (base: string, id: number): Promise<void> =>
  request(base, `/api/suggestions/${id}`, { method: 'DELETE' }).then(() => undefined);
