import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { TimeEntry, UpsertTimeEntryInput, WeeklySummary } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'TIME', init);
}

export const listEntries = (base: string, weekKey?: string): Promise<TimeEntry[]> => {
  const query = weekKey ? `?weekKey=${encodeURIComponent(weekKey)}` : '';
  return request<{ entries: TimeEntry[] }>(base, `/api/time/entries${query}`).then((r) => r.entries);
};

export const listSummaries = (base: string): Promise<WeeklySummary[]> =>
  request<{ summaries: WeeklySummary[] }>(base, '/api/time/summaries').then((r) => r.summaries);

export const createEntry = (base: string, input: UpsertTimeEntryInput): Promise<TimeEntry> =>
  request<{ entry: TimeEntry }>(base, '/api/time/entries', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.entry);

/** Submit every draft entry in a week; returns the number of rows affected. */
export const submitWeek = (base: string, weekKey: string): Promise<number> =>
  request<{ updated: number }>(base, `/api/time/weeks/${encodeURIComponent(weekKey)}/submit`, {
    method: 'POST',
  }).then((r) => r.updated);

export const deleteEntry = (base: string, id: number): Promise<void> =>
  request(base, `/api/time/entries/${id}`, { method: 'DELETE' }).then(() => undefined);
