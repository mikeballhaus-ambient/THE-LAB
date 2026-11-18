import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { PollStatus, PollWithResults } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'POLLS', init);
}

export const listPolls = (base: string, voter = ''): Promise<PollWithResults[]> => {
  const query = voter.trim() ? `?voter=${encodeURIComponent(voter.trim())}` : '';
  return request<{ polls: PollWithResults[] }>(base, `/api/polls${query}`).then(
    (body) => body.polls ?? [],
  );
};

/** Cast a vote for one option; the server rejects closed polls. */
export const castVote = (
  base: string,
  pollId: number,
  optionId: number,
  voter: string,
): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>(base, '/api/poll-votes', {
    method: 'POST',
    body: JSON.stringify({ pollId, optionId, voter }),
  });

export const setPollStatus = (
  base: string,
  id: number,
  status: PollStatus,
): Promise<PollWithResults> =>
  request<{ poll: PollWithResults }>(base, `/api/polls/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }).then((r) => r.poll);

export const deletePoll = (base: string, id: number): Promise<void> =>
  request(base, `/api/polls/${id}`, { method: 'DELETE' }).then(() => undefined);
