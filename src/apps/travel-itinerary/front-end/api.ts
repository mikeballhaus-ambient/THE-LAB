import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { TripWithItems, UpsertItineraryItemInput, UpsertTripInput } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'TRAVEL', init);
}

export const listTrips = (base: string): Promise<TripWithItems[]> =>
  request<{ trips: TripWithItems[] }>(base, '/api/travel/trips').then((body) => body.trips ?? []);

export const createTrip = (base: string, input: UpsertTripInput): Promise<TripWithItems> =>
  request<{ trip: TripWithItems }>(base, '/api/travel/trips', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.trip);

export const addItem = (
  base: string,
  input: UpsertItineraryItemInput,
): Promise<{ item: unknown }> =>
  request<{ item: unknown }>(base, '/api/travel/items', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const deleteTrip = (base: string, id: number): Promise<void> =>
  request(base, `/api/travel/trips/${id}`, { method: 'DELETE' }).then(() => undefined);
