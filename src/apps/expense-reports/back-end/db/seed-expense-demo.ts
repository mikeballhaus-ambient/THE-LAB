import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { DEMO_ACCOUNTS, DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';

export const EXPENSE_DEMO_PACK_ID = 'expense-demo';
export const EXPENSE_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.EXPENSE_REPORTS_DEMO;

/**
 * Bump when demo row shape or content changes so boot re-seeds tracked rows on upgraded installs.
 * Stored in the app DB `configs` table (see weather demo seed).
 */
export const EXPENSE_DEMO_SEED_REVISION = 1;
const EXPENSE_DEMO_REVISION_FLAG = `${EXPENSE_DEMO_BOOT_FLAG}:revision`;

function needsDemoRevisionRefresh(db: Database): boolean {
  try {
    const row = db
      .prepare('SELECT value FROM configs WHERE key = ? LIMIT 1')
      .get(EXPENSE_DEMO_REVISION_FLAG) as { value?: string } | undefined;
    const applied = Number.parseInt(row?.value ?? '', 10);
    return !Number.isFinite(applied) || applied < EXPENSE_DEMO_SEED_REVISION;
  } catch {
    return true;
  }
}

function recordDemoRevision(db: Database): void {
  db.prepare(
    `INSERT INTO configs (key, value, type, description, updated_at)
     VALUES (?, ?, 'number', 'Expense demo seed revision', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(EXPENSE_DEMO_REVISION_FLAG, String(EXPENSE_DEMO_SEED_REVISION));
}

/** Story A anchor: the onsite trip expense for the Northwind Labs deal. */
export const EXPENSE_DEMO_NORTHWIND_TITLE = 'Northwind onsite travel';
export const EXPENSE_DEMO_NORTHWIND_CENTS = 124_000;

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';

interface ExpenseSpec {
  title: string;
  submitter: string;
  category: string;
  /** Integer cents — never a float. */
  amountCents: number;
  status: ExpenseStatus;
  notes: string;
  dayOffset: number;
}

const NORTHWIND = DEMO_ACCOUNTS[0];
const SUMMIT = DEMO_ACCOUNTS[1];

/**
 * Eight expenses covering every status (rule 6). Amounts are integer cents.
 * The Northwind onsite row carries the Story A story anchor asserted by the test.
 */
const EXPENSES: readonly ExpenseSpec[] = [
  {
    title: EXPENSE_DEMO_NORTHWIND_TITLE,
    submitter: 'Mia Chen',
    category: 'travel',
    amountCents: EXPENSE_DEMO_NORTHWIND_CENTS,
    status: 'approved',
    notes: `Onsite kickoff for the ${NORTHWIND} platform deal (already approved).`,
    dayOffset: -20,
  },
  {
    title: 'Northwind onsite — hotel',
    submitter: 'Mia Chen',
    category: 'travel',
    amountCents: 86_400,
    status: 'reimbursed',
    notes: 'Three nights, downtown Seattle.',
    dayOffset: -21,
  },
  {
    title: `Summit Health conference pass`,
    submitter: 'Jordan Lee',
    category: 'other',
    amountCents: 149_500,
    status: 'submitted',
    notes: `Pending manager approval — ${SUMMIT} interoperability track.`,
    dayOffset: -8,
  },
  {
    title: 'Summit Health conference — flights',
    submitter: 'Jordan Lee',
    category: 'travel',
    amountCents: 61_250,
    status: 'submitted',
    notes: 'Pending manager approval — DEN to AUS return.',
    dayOffset: -7,
  },
  {
    title: 'Connector contract review — reference book',
    submitter: 'Sam Patel',
    category: 'other',
    amountCents: 5_999,
    status: 'approved',
    notes: 'API design reference for the catalog contracts.',
    dayOffset: -14,
  },
  {
    title: 'Design tool subscription',
    submitter: 'Casey Hayes',
    category: 'software',
    amountCents: 24_000,
    status: 'reimbursed',
    notes: 'Annual seat renewal, billed monthly share.',
    dayOffset: -30,
  },
  {
    title: 'Team lunch — sprint close',
    submitter: 'Drew Ward',
    category: 'meals',
    amountCents: 18_750,
    status: 'rejected',
    notes: 'Declined in Lab Approvals — missing itemised receipt.',
    dayOffset: -4,
  },
  {
    title: 'Prototype hardware',
    submitter: 'Quinn Reed',
    category: 'supplies',
    amountCents: 42_900,
    status: 'draft',
    notes: 'Submit when the vendor quote is attached.',
    dayOffset: -1,
  },
];

export function hasExpenseDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, EXPENSE_DEMO_PACK_ID).has();
}

export interface SeedExpenseDemoResult {
  inserted: number;
}

export function seedExpenseDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedExpenseDemoResult {
  const ledger = new DemoSeedLedger(db, EXPENSE_DEMO_PACK_ID);
  const expectedRows = EXPENSES.length;

  if (options?.adminApply && ledger.has()) {
    removeExpenseDemo(db);
  }

  if (needsDemoRevisionRefresh(db)) {
    if (ledger.has()) {
      removeExpenseDemo(db);
    }
  } else if (ledger.has() && ledger.count() !== expectedRows) {
    removeExpenseDemo(db);
  }

  if (shouldSkipDemoSeed(db, ledger, EXPENSE_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  ensurePersonIdColumn(db, 'expense_reports', 'submitter_id');

  let inserted = 0;

  for (const expense of EXPENSES) {
    const spentOn = shiftDemoDate(DEMO_TODAY, expense.dayOffset);
    const id = insertRow(db, 'expense_reports', {
      title: expense.title,
      submitter: expense.submitter,
      submitter_id: demoCastIdForName(expense.submitter),
      amount_cents: Math.round(expense.amountCents),
      currency: 'USD',
      category: expense.category,
      spent_on: spentOn,
      status: expense.status,
      receipt_url: '',
      notes: expense.notes,
      created_at: `${spentOn}T09:00:00`,
      updated_at: `${DEMO_TODAY}T09:00:00`,
    });
    ledger.track('expense_reports', id);
    inserted += 1;
  }

  recordDemoRevision(db);
  return { inserted };
}

export function removeExpenseDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, EXPENSE_DEMO_PACK_ID);
  return ledger.deleteTracked(['expense_reports']);
}

/** Every expense status present in the demo data (rule 6). */
export function expenseDemoStatuses(): string[] {
  return [...new Set(EXPENSES.map((e) => e.status))];
}

/** Cast submitters referenced by this seed. */
export function expenseDemoSubmitters(): string[] {
  return [...new Set(EXPENSES.map((e) => e.submitter))];
}

/** Boot-time adapter used by `runDemoSeedOnBoot`. */
export const expenseDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: EXPENSE_DEMO_BOOT_FLAG,
  has: hasExpenseDemoDataset,
  seed: seedExpenseDemoIfMissing,
};
