import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { Applicant, HiringStage, UpsertApplicantInput } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'APPLICANT', init);
}

export const listApplicants = (base: string): Promise<Applicant[]> =>
  request<{ applicants: Applicant[] }>(base, '/api/applicants').then((body) => body.applicants ?? []);

export const createApplicant = (base: string, input: UpsertApplicantInput): Promise<Applicant> =>
  request<{ applicant: Applicant }>(base, '/api/applicants', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.applicant);

/** Move a candidate to a new pipeline stage. */
export const setStage = (base: string, id: number, stage: HiringStage): Promise<Applicant> =>
  request<{ applicant: Applicant }>(base, `/api/applicants/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  }).then((r) => r.applicant);

export const deleteApplicant = (base: string, id: number): Promise<void> =>
  request(base, `/api/applicants/${id}`, { method: 'DELETE' }).then(() => undefined);
