import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { EventWithRsvps, Rsvp, UpsertRsvpInput } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'RSVP', init);
}

export const listEvents = (base: string): Promise<EventWithRsvps[]> =>
  request<{ events: EventWithRsvps[] }>(base, '/api/rsvp/events').then((body) => body.events ?? []);

export const addRsvp = (base: string, input: UpsertRsvpInput): Promise<Rsvp> =>
  request<{ rsvp: Rsvp }>(base, '/api/rsvp/responses', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.rsvp);

export const deleteEvent = (base: string, id: number): Promise<void> =>
  request(base, `/api/rsvp/events/${id}`, { method: 'DELETE' }).then(() => undefined);

export const deleteRsvp = (base: string, id: number): Promise<void> =>
  request(base, `/api/rsvp/responses/${id}`, { method: 'DELETE' }).then(() => undefined);
