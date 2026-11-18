import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_TODAY, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const RENTAL_DEMO_PACK_ID = 'rental-demo';
export const RENTAL_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.RENTAL_PROPERTY_DEMO;

/** Bump when demo row shape or content changes so boot re-seeds tracked rows on upgraded installs. */
export const RENTAL_DEMO_SEED_REVISION = 1;
const RENTAL_DEMO_REVISION_FLAG = `${RENTAL_DEMO_BOOT_FLAG}:revision`;

function needsDemoRevisionRefresh(db: Database): boolean {
  try {
    const row = db
      .prepare('SELECT value FROM configs WHERE key = ? LIMIT 1')
      .get(RENTAL_DEMO_REVISION_FLAG) as { value?: string } | undefined;
    const applied = Number.parseInt(row?.value ?? '', 10);
    return !Number.isFinite(applied) || applied < RENTAL_DEMO_SEED_REVISION;
  } catch {
    return true;
  }
}

function recordDemoRevision(db: Database): void {
  db.prepare(
    `INSERT INTO configs (key, value, type, description, updated_at)
     VALUES (?, ?, 'number', 'Rental property demo seed revision', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(RENTAL_DEMO_REVISION_FLAG, String(RENTAL_DEMO_SEED_REVISION));
}

type PropertyStatus = 'vacant' | 'occupied' | 'maintenance';
type LeaseStatus = 'active' | 'ended' | 'pending';
type RentStatus = 'due' | 'paid' | 'late';

interface PaymentSpec {
  /** Billing period, `YYYY-MM`, relative to DEMO_TODAY (negative = earlier). */
  monthOffset: number;
  amountCents: number;
  status: RentStatus;
}

interface LeaseSpec {
  tenantName: string;
  startOffset: number;
  endOffset: number;
  status: LeaseStatus;
  payments: readonly PaymentSpec[];
}

interface PropertySpec {
  name: string;
  address: string;
  monthlyRentCents: number;
  status: PropertyStatus;
  notes: string;
  leases: readonly LeaseSpec[];
}

/**
 * Four properties, four leases and ten payments (18 rows).
 *
 * - Every property status appears; the fourth property is `vacant` with no lease
 *   (rule 6).
 * - Every lease status appears — `pending` is a future lease on the fourth property.
 * - Every payment status appears, and `paid` rows carry `paid_at` while `due`/`late`
 *   rows do not (the test asserts that invariant directly).
 *
 * Tenants are **external people**, deliberately not `DEMO_CAST` members.
 */
const PROPERTIES: readonly PropertySpec[] = [
  {
    name: 'Maple Street duplex',
    address: '1420 Maple St, Denver, CO',
    monthlyRentCents: 185_000,
    status: 'occupied',
    notes: 'Both units leased; shared laundry in the basement.',
    leases: [
      {
        tenantName: 'Rosa Delgado',
        startOffset: -300,
        endOffset: 65,
        status: 'active',
        payments: [
          { monthOffset: -2, amountCents: 185_000, status: 'paid' },
          { monthOffset: -1, amountCents: 185_000, status: 'paid' },
          { monthOffset: 0, amountCents: 185_000, status: 'due' },
        ],
      },
    ],
  },
  {
    name: 'Cedar Park condo',
    address: '88 Cedar Park Ave, Austin, TX',
    monthlyRentCents: 142_500,
    status: 'occupied',
    notes: 'Corner unit with a covered parking spot.',
    leases: [
      {
        tenantName: 'Andre Whitfield',
        startOffset: -420,
        endOffset: 120,
        status: 'active',
        payments: [
          { monthOffset: -3, amountCents: 142_500, status: 'paid' },
          { monthOffset: -2, amountCents: 142_500, status: 'late' },
          { monthOffset: -1, amountCents: 142_500, status: 'paid' },
        ],
      },
    ],
  },
  {
    name: 'Harborview townhouse',
    address: '5 Harborview Walk, Seattle, WA',
    monthlyRentCents: 265_000,
    status: 'maintenance',
    notes: 'Water damage repair in the upstairs bathroom before reletting.',
    leases: [
      {
        tenantName: 'Greta Lindqvist',
        startOffset: -700,
        endOffset: -45,
        status: 'ended',
        payments: [
          { monthOffset: -6, amountCents: 265_000, status: 'paid' },
          { monthOffset: -5, amountCents: 265_000, status: 'paid' },
        ],
      },
    ],
  },
  {
    name: 'Pine Ridge cottage',
    address: '31 Pine Ridge Rd, Boulder, CO',
    monthlyRentCents: 198_000,
    status: 'vacant',
    notes: 'Relet pending — lease signed, move-in next month.',
    leases: [
      {
        tenantName: 'Owen Marsh',
        startOffset: 20,
        endOffset: 385,
        status: 'pending',
        payments: [
          { monthOffset: 1, amountCents: 198_000, status: 'due' },
          { monthOffset: 2, amountCents: 198_000, status: 'due' },
        ],
      },
    ],
  },
];

/** Shift a `YYYY-MM` month key by `offset` months. */
function shiftMonth(monthOffset: number): string {
  const base = new Date(`${DEMO_TODAY}T00:00:00Z`);
  const shifted = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 1),
  );
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function hasRentalDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, RENTAL_DEMO_PACK_ID).has();
}

export interface SeedRentalDemoResult {
  inserted: number;
}

const RENTAL_DEMO_EXPECTED_TRACKED_ROWS =
  PROPERTIES.length +
  PROPERTIES.reduce((n, p) => n + p.leases.length, 0) +
  PROPERTIES.reduce(
    (n, p) => n + p.leases.reduce((m, l) => m + l.payments.length, 0),
    0,
  );

export function seedRentalDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedRentalDemoResult {
  const ledger = new DemoSeedLedger(db, RENTAL_DEMO_PACK_ID);

  if (options?.adminApply && ledger.has()) {
    removeRentalDemo(db);
  }

  if (needsDemoRevisionRefresh(db)) {
    if (ledger.has()) {
      removeRentalDemo(db);
    }
  } else if (ledger.has() && ledger.count() !== RENTAL_DEMO_EXPECTED_TRACKED_ROWS) {
    removeRentalDemo(db);
  }

  if (shouldSkipDemoSeed(db, ledger, RENTAL_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  let inserted = 0;

  for (const property of PROPERTIES) {
    const propertyId = insertRow(db, 'rental_properties', {
      name: property.name,
      address: property.address,
      monthly_rent_cents: Math.round(property.monthlyRentCents),
      status: property.status,
      notes: property.notes,
      created_at: `${DEMO_TODAY}T08:00:00`,
    });
    ledger.track('rental_properties', propertyId);
    inserted += 1;

    for (const lease of property.leases) {
      const leaseId = insertRow(db, 'rental_leases', {
        property_id: propertyId,
        tenant_name: lease.tenantName,
        start_date: shiftDemoDate(DEMO_TODAY, lease.startOffset),
        end_date: shiftDemoDate(DEMO_TODAY, lease.endOffset),
        status: lease.status,
      });
      ledger.track('rental_leases', leaseId);
      inserted += 1;

      for (const payment of lease.payments) {
        const periodMonth = shiftMonth(payment.monthOffset);
        const paidAt =
          payment.status === 'paid' ? `${periodMonth}-05T10:00:00` : null;
        const paymentId = insertRow(db, 'rental_payments', {
          lease_id: leaseId,
          period_month: periodMonth,
          amount_cents: Math.round(payment.amountCents),
          status: payment.status,
          paid_at: paidAt,
        });
        ledger.track('rental_payments', paymentId);
        inserted += 1;
      }
    }
  }

  recordDemoRevision(db);

  return { inserted };
}

export function removeRentalDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, RENTAL_DEMO_PACK_ID);
  return ledger.deleteTracked(['rental_payments', 'rental_leases', 'rental_properties']);
}

/** Every property status present in the demo data (rule 6). */
export function rentalDemoPropertyStatuses(): string[] {
  return [...new Set(PROPERTIES.map((p) => p.status))];
}

/** Every lease status present in the demo data (rule 6). */
export function rentalDemoLeaseStatuses(): string[] {
  return [...new Set(PROPERTIES.flatMap((p) => p.leases.map((l) => l.status)))];
}

/** Every payment status present in the demo data (rule 6). */
export function rentalDemoPaymentStatuses(): string[] {
  return [
    ...new Set(
      PROPERTIES.flatMap((p) => p.leases.flatMap((l) => l.payments.map((pay) => pay.status))),
    ),
  ];
}

/** External tenant names — intentionally outside `DEMO_CAST`. */
export function rentalDemoTenantNames(): string[] {
  return [...new Set(PROPERTIES.flatMap((p) => p.leases.map((l) => l.tenantName)))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const rentalDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: RENTAL_DEMO_BOOT_FLAG,
  has: hasRentalDemoDataset,
  seed: seedRentalDemoIfMissing,
};
