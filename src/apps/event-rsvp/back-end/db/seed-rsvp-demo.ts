import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const RSVP_DEMO_PACK_ID = 'rsvp-demo';
export const RSVP_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.EVENT_RSVP_DEMO;

type RsvpResponse = 'yes' | 'maybe' | 'no';

interface ResponseSpec {
  guest: string;
  response: RsvpResponse;
  headcount: number;
  note: string;
}

interface EventSpec {
  title: string;
  description: string;
  startOffset: number;
  endOffset: number;
  location: string;
  capacity: number;
  responses: readonly ResponseSpec[];
}

/**
 * Three events with twelve guest responses. Every response value appears (rule 6)
 * and every guest is a `DEMO_CAST` member with `guest_user_id` set.
 */
const EVENTS: readonly EventSpec[] = [
  {
    title: 'Platform integration showcase',
    description: 'Walkthrough of the catalog connectors, charts and demo packs.',
    startOffset: -12,
    endOffset: -12,
    location: 'Denver office, room 2A',
    capacity: 20,
    responses: [
      { guest: 'Mia Chen', response: 'yes', headcount: 1, note: 'Presenting the connector contract.' },
      { guest: 'Jordan Lee', response: 'yes', headcount: 1, note: '' },
      { guest: 'Sam Patel', response: 'yes', headcount: 2, note: 'Bringing a colleague from support.' },
      { guest: 'Casey Hayes', response: 'maybe', headcount: 1, note: 'Depends on the design review.' },
      { guest: 'Drew Ward', response: 'no', headcount: 0, note: 'Out of office that week.' },
    ],
  },
  {
    title: 'Quarterly business review',
    description: 'Northwind and Summit account reviews with the delivery leads.',
    startOffset: -4,
    endOffset: -4,
    location: 'Video call',
    capacity: 12,
    responses: [
      { guest: 'Mia Chen', response: 'yes', headcount: 1, note: '' },
      { guest: 'Taylor Nguyen', response: 'yes', headcount: 1, note: 'Chairing the review.' },
      { guest: 'Quinn Reed', response: 'no', headcount: 0, note: 'On leave.' },
      { guest: 'Blake Torres', response: 'maybe', headcount: 1, note: 'Waiting on the agenda.' },
    ],
  },
  {
    title: 'Games night',
    description: 'Word Tile and Checkers tournament in the lobby.',
    startOffset: 6,
    endOffset: 6,
    location: 'Denver office, break room',
    capacity: 16,
    responses: [
      { guest: 'Casey Hayes', response: 'yes', headcount: 1, note: 'Defending the Word Tile title.' },
      { guest: 'Cameron Foster', response: 'yes', headcount: 2, note: 'Plus one.' },
      { guest: 'Riley Brooks', response: 'maybe', headcount: 1, note: 'If onboarding allows.' },
    ],
  },
];

export function hasRsvpDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, RSVP_DEMO_PACK_ID).has();
}

export interface SeedRsvpDemoResult {
  inserted: number;
}

export function seedRsvpDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedRsvpDemoResult {
  const ledger = new DemoSeedLedger(db, RSVP_DEMO_PACK_ID);
  if (shouldSkipDemoSeed(db, ledger, RSVP_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'rsvp_responses', 'guest_user_id');

  let inserted = 0;

  for (const event of EVENTS) {
    const id = insertRow(db, 'rsvp_events', {
      title: event.title,
      description: event.description,
      starts_at: `${shiftDemoDate(DEMO_TODAY, event.startOffset)}T17:00:00`,
      ends_at: `${shiftDemoDate(DEMO_TODAY, event.endOffset)}T19:00:00`,
      location: event.location,
      capacity: event.capacity,
      created_at: `${shiftDemoDate(DEMO_TODAY, event.startOffset - 14)}T09:00:00`,
    });
    ledger.track('rsvp_events', id);
    inserted += 1;

    for (const response of event.responses) {
      const responseId = insertRow(db, 'rsvp_responses', {
        event_id: id,
        guest_name: response.guest,
        guest_user_id: demoCastIdForName(response.guest),
        response: response.response,
        headcount: response.headcount,
        note: response.note,
        created_at: `${DEMO_TODAY}T09:00:00`,
      });
      ledger.track('rsvp_responses', responseId);
      inserted += 1;
    }
  }

  return { inserted };
}

export function removeRsvpDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, RSVP_DEMO_PACK_ID);
  return ledger.deleteTracked(['rsvp_responses', 'rsvp_events']);
}

/** Every response value present in the demo data (rule 6). */
export function rsvpDemoResponses(): string[] {
  return [...new Set(EVENTS.flatMap((e) => e.responses.map((r) => r.response)))];
}

/** Cast guest names referenced by this seed. */
export function rsvpDemoGuestNames(): string[] {
  return [...new Set(EVENTS.flatMap((e) => e.responses.map((r) => r.guest)))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const rsvpDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: RSVP_DEMO_BOOT_FLAG,
  has: hasRsvpDemoDataset,
  seed: seedRsvpDemoIfMissing,
};
