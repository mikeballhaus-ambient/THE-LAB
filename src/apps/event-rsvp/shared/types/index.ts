export type RsvpResponse = 'yes' | 'maybe' | 'no';

export interface EventItem {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  createdAt: string;
}

export interface Rsvp {
  id: number;
  eventId: number;
  guestName: string;
  /** Platform user id for the guest (phase 31). */
  guestUserId?: number | null;
  response: RsvpResponse;
  headcount: number;
  note: string;
  createdAt: string;
}

/** Event with its guest RSVPs and the total headcount attending. */
export interface EventWithRsvps extends EventItem {
  rsvps: Rsvp[];
  attending: number;
}

export interface UpsertEventInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
}

export interface UpsertRsvpInput {
  eventId: number;
  guestName: string;
  guestUserId?: number | null;
  response: RsvpResponse;
  headcount: number;
  note: string;
}
