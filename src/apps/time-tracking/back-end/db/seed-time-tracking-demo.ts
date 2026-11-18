import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import {
  DEMO_CAST,
  DEMO_TODAY,
  demoCastNameForIndex,
  demoCastIdForIndex,
  shiftDemoDate,
} from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, ensureTextColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const TIME_TRACKING_DEMO_PACK_ID = 'time-tracking-demo';
export const TIME_TRACKING_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.TIME_TRACKING_DEMO;

/** Every cast member gets at least this many rows in the time log UI. */
export const TIME_TRACKING_DEMO_ENTRIES_PER_USER = 5;

type TimeEntryStatus = 'draft' | 'submitted';

interface EntryTemplate {
  project: string;
  task: string;
  minutes: number;
  billable: boolean;
  notes: string;
  status: TimeEntryStatus;
  dayOffset: number;
}

const ENTRY_TEMPLATES: readonly EntryTemplate[] = [
  { project: 'Lab platform', task: 'Connector contract review', minutes: 120, billable: true, notes: 'Catalog discovery manifests.', status: 'submitted', dayOffset: -12 },
  { project: 'Lab platform', task: 'Demo seed packs', minutes: 180, billable: true, notes: 'Okr, travel, charter packs.', status: 'submitted', dayOffset: -11 },
  { project: 'CRM integration', task: 'Northwind account backfill', minutes: 90, billable: true, notes: 'Accounts entity rollout.', status: 'submitted', dayOffset: -10 },
  { project: 'Lab platform', task: 'Integration surface charts', minutes: 150, billable: true, notes: 'Chart binding slots.', status: 'submitted', dayOffset: -9 },
  { project: 'CRM integration', task: 'Ledger memo convention', minutes: 60, billable: true, notes: 'Cross-app reconciliation.', status: 'submitted', dayOffset: -8 },
  { project: 'Northwind platform', task: 'Onsite kickoff prep', minutes: 240, billable: true, notes: 'Seattle onsite agenda.', status: 'submitted', dayOffset: -7 },
  { project: 'Northwind platform', task: 'Onsite workshop delivery', minutes: 300, billable: true, notes: 'Two-day integration workshop.', status: 'submitted', dayOffset: -3 },
  { project: 'Northwind platform', task: 'Onsite follow-ups', minutes: 75, billable: true, notes: 'Open questions from the workshop.', status: 'draft', dayOffset: -2 },
  { project: 'Lab platform', task: 'Restoration triage', minutes: 135, billable: true, notes: 'Corrupted app sources.', status: 'draft', dayOffset: -1 },
  { project: 'Lab platform', task: 'Word Tile shared kit', minutes: 165, billable: true, notes: 'Rebuild from predecessor app.', status: 'draft', dayOffset: 0 },
  { project: 'CRM integration', task: 'Form binding smoke test', minutes: 45, billable: false, notes: 'Internal test pass.', status: 'draft', dayOffset: 0 },
  { project: 'Lab platform', task: 'Sprint review notes', minutes: 30, billable: false, notes: 'Internal meeting.', status: 'draft', dayOffset: -1 },
];

function buildDemoEntries(): EntryTemplate[] {
  const rows: EntryTemplate[] = [];
  for (let castIndex = 0; castIndex < DEMO_CAST.length; castIndex += 1) {
    for (let n = 0; n < TIME_TRACKING_DEMO_ENTRIES_PER_USER; n += 1) {
      const template = ENTRY_TEMPLATES[(castIndex * TIME_TRACKING_DEMO_ENTRIES_PER_USER + n) % ENTRY_TEMPLATES.length]!;
      rows.push({
        ...template,
        dayOffset: template.dayOffset - castIndex - n,
      });
    }
  }
  return rows;
}

const ENTRIES = buildDemoEntries();

/** ISO week key (`YYYY-Www`) for a `YYYY-MM-DD` date. */
function weekKeyFor(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function hasTimeTrackingDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, TIME_TRACKING_DEMO_PACK_ID).has();
}

export interface SeedTimeTrackingDemoResult {
  inserted: number;
}

export function seedTimeTrackingDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedTimeTrackingDemoResult {
  const ledger = new DemoSeedLedger(db, TIME_TRACKING_DEMO_PACK_ID);
  const expectedRows = ENTRIES.length;
  if (ledger.has() && ledger.count() !== expectedRows) {
    removeTimeTrackingDemo(db);
  }
  if (shouldSkipDemoSeed(db, ledger, TIME_TRACKING_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'time_entries', 'user_id');
  ensureTextColumn(db, 'time_entries', 'user_name', '');

  let inserted = 0;

  ENTRIES.forEach((entry, index) => {
    const castIndex = Math.floor(index / TIME_TRACKING_DEMO_ENTRIES_PER_USER);
    const date = shiftDemoDate(DEMO_TODAY, entry.dayOffset);
    const id = insertRow(db, 'time_entries', {
      user_id: demoCastIdForIndex(castIndex),
      user_name: demoCastNameForIndex(castIndex),
      project: entry.project,
      task: entry.task,
      date,
      minutes: entry.minutes,
      billable: entry.billable ? 1 : 0,
      notes: entry.notes,
      status: entry.status,
      week_key: weekKeyFor(date),
      created_at: `${date}T17:00:00`,
    });
    ledger.track('time_entries', id);
    inserted += 1;
  });

  return { inserted };
}

export function removeTimeTrackingDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, TIME_TRACKING_DEMO_PACK_ID);
  return ledger.deleteTracked(['time_entries']);
}

/** Distinct projects present in the demo data. */
export function timeTrackingDemoProjects(): string[] {
  return [...new Set(ENTRY_TEMPLATES.map((e) => e.project))];
}

/** Every entry status present in the demo data (rule 6). */
export function timeTrackingDemoStatuses(): string[] {
  return [...new Set(ENTRY_TEMPLATES.map((e) => e.status))];
}

/** Cast person names owning the seeded entries. */
export function timeTrackingDemoPeople(): string[] {
  return DEMO_CAST.map((_, index) => demoCastNameForIndex(index));
}

/** Total seeded time entry rows. */
export function timeTrackingDemoEntryCount(): number {
  return ENTRIES.length;
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const timeTrackingDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: TIME_TRACKING_DEMO_BOOT_FLAG,
  has: hasTimeTrackingDemoDataset,
  seed: seedTimeTrackingDemoIfMissing,
};
