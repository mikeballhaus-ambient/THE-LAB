export type ItineraryItemKind = 'flight' | 'hotel' | 'activity' | 'transport' | 'other';

export interface Trip {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
}

export interface ItineraryItem {
  id: number;
  tripId: number;
  kind: ItineraryItemKind;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  confirmation: string;
  order: number;
}

export interface TripWithItems extends Trip {
  items: ItineraryItem[];
}

export interface UpsertTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface UpsertItineraryItemInput {
  tripId: number;
  kind: ItineraryItemKind;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  confirmation: string;
}
