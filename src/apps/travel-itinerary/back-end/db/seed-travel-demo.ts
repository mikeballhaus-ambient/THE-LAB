import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const TRAVEL_DEMO_PACK_ID = 'travel-demo';
export const TRAVEL_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.TRAVEL_ITINERARY_DEMO;

type ItineraryItemKind = 'flight' | 'hotel' | 'activity' | 'transport';

interface ItemSpec {
  kind: ItineraryItemKind;
  title: string;
  startOffset: number;
  endOffset: number;
  location: string;
  confirmation: string;
}

interface TripSpec {
  name: string;
  destination: string;
  startOffset: number;
  endOffset: number;
  notes: string;
  items: readonly ItemSpec[];
}

/**
 * Two trips with eight items. Every kind except `other` is used (rule 6) — the
 * test pins the exact set `activity | flight | hotel | transport`.
 */
const TRIPS: readonly TripSpec[] = [
  {
    name: 'Northwind onsite',
    destination: 'Seattle, WA',
    startOffset: -21,
    endOffset: -18,
    notes: 'Kickoff with the Northwind Labs platform team.',
    items: [
      {
        kind: 'flight',
        title: 'DEN → SEA',
        startOffset: -21,
        endOffset: -21,
        location: 'Denver International Airport',
        confirmation: 'NW-4471',
      },
      {
        kind: 'hotel',
        title: 'Harborview Hotel, 3 nights',
        startOffset: -21,
        endOffset: -18,
        location: 'Downtown Seattle',
        confirmation: 'HV-88213',
      },
      {
        kind: 'transport',
        title: 'Airport transfer',
        startOffset: -21,
        endOffset: -21,
        location: 'SEA baggage claim',
        confirmation: 'TR-5520',
      },
      {
        kind: 'activity',
        title: 'Platform integration workshop',
        startOffset: -20,
        endOffset: -20,
        location: 'Northwind Labs HQ',
        confirmation: '',
      },
      {
        kind: 'activity',
        title: 'Quarterly business review',
        startOffset: -19,
        endOffset: -19,
        location: 'Northwind Labs HQ',
        confirmation: '',
      },
    ],
  },
  {
    name: 'Summit Health conference',
    destination: 'Austin, TX',
    startOffset: -7,
    endOffset: -4,
    notes: 'Two conference days plus a partner dinner.',
    items: [
      {
        kind: 'flight',
        title: 'DEN → AUS',
        startOffset: -7,
        endOffset: -7,
        location: 'Denver International Airport',
        confirmation: 'SH-2210',
      },
      {
        kind: 'hotel',
        title: 'Congress Avenue Suites, 3 nights',
        startOffset: -7,
        endOffset: -4,
        location: 'Austin, TX',
        confirmation: 'CA-99331',
      },
      {
        kind: 'activity',
        title: 'Health data interoperability panel',
        startOffset: -5,
        endOffset: -5,
        location: 'Austin Convention Center',
        confirmation: '',
      },
    ],
  },
];

export function hasTravelDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, TRAVEL_DEMO_PACK_ID).has();
}

export interface SeedTravelDemoResult {
  inserted: number;
}

export function seedTravelDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedTravelDemoResult {
  const ledger = new DemoSeedLedger(db, TRAVEL_DEMO_PACK_ID);
  if (shouldSkipDemoSeed(db, ledger, TRAVEL_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  let inserted = 0;

  for (const trip of TRIPS) {
    const tripId = insertRow(db, 'travel_trips', {
      name: trip.name,
      destination: trip.destination,
      start_date: shiftDemoDate(DEMO_TODAY, trip.startOffset),
      end_date: shiftDemoDate(DEMO_TODAY, trip.endOffset),
      notes: trip.notes,
      created_at: `${shiftDemoDate(DEMO_TODAY, trip.startOffset)}T08:00:00`,
    });
    ledger.track('travel_trips', tripId);
    inserted += 1;

    trip.items.forEach((item, index) => {
      const itemId = insertRow(db, 'travel_items', {
        trip_id: tripId,
        kind: item.kind,
        title: item.title,
        start_at: `${shiftDemoDate(DEMO_TODAY, item.startOffset)}T09:00:00`,
        end_at: `${shiftDemoDate(DEMO_TODAY, item.endOffset)}T17:00:00`,
        location: item.location,
        confirmation: item.confirmation,
        order: index,
      });
      ledger.track('travel_items', itemId);
      inserted += 1;
    });
  }

  return { inserted };
}

export function removeTravelDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, TRAVEL_DEMO_PACK_ID);
  return ledger.deleteTracked(['travel_items', 'travel_trips']);
}

/** Every itinerary kind present in the demo data (rule 6). */
export function travelDemoItemKinds(): string[] {
  return [...new Set(TRIPS.flatMap((t) => t.items.map((i) => i.kind)))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const travelDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: TRAVEL_DEMO_BOOT_FLAG,
  has: hasTravelDemoDataset,
  seed: seedTravelDemoIfMissing,
};
