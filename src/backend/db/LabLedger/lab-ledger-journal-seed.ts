import { labLedgerRepository } from './lab-ledger-repository';
import { postBalancedEntryToRepository } from './lab-ledger-posting';

export { ledgerMemoForCompany } from '@/shared/utils/ledger-memo-format';
import { ledgerMemoForCompany } from '@/shared/utils/ledger-memo-format';

/** Idempotent default journal samples (standard chart of accounts). */
export const DEFAULT_LEDGER_JOURNAL_MARKER_ENTRY_ID = 'e1000001-0001-4001-8001-000000000001';

const DEFAULT_LEDGER_SAMPLE_ENTRY_ID_2 = 'e1000002-0002-4002-8002-000000000002';
const DEFAULT_LEDGER_SAMPLE_ENTRY_ID_3 = 'e1000003-0003-4003-8003-000000000003';

const DEFAULT_JOURNAL_ENTRIES = [
  {
    id: DEFAULT_LEDGER_JOURNAL_MARKER_ENTRY_ID,
    occurredAt: '2026-09-01T10:00:00.000Z',
    memo: 'Sample: product sale (cash)',
    lines: [
      { code: '1000', side: 'debit' as const, amountCents: 50_000 },
      { code: '4000', side: 'credit' as const, amountCents: 50_000 },
    ],
  },
  {
    id: DEFAULT_LEDGER_SAMPLE_ENTRY_ID_2,
    occurredAt: '2026-09-05T14:30:00.000Z',
    memo: 'Sample: office supplies',
    lines: [
      { code: '5000', side: 'debit' as const, amountCents: 12_000 },
      { code: '1000', side: 'credit' as const, amountCents: 12_000 },
    ],
  },
  {
    id: DEFAULT_LEDGER_SAMPLE_ENTRY_ID_3,
    occurredAt: '2026-09-12T09:15:00.000Z',
    memo: 'Sample: vendor bill (accounts payable)',
    lines: [
      { code: '5000', side: 'debit' as const, amountCents: 8_000 },
      { code: '2000', side: 'credit' as const, amountCents: 8_000 },
    ],
  },
];

export const DEMO_LEDGER_JOURNAL_MARKER_ENTRY_ID = 'a1000006-0006-4006-8006-000000000006';

/** Story A — Northwind Labs Platform Starter, $24,000 (mirrors the CRM sale amount). */
export const DEMO_LEDGER_NORTHWIND_ENTRY_ID = 'a1000007-0007-4007-8007-000000000007';

/** Story B — Summit Health Premium Support, $1,990 (mirrors the CRM draft quote). */
export const DEMO_LEDGER_SUMMIT_ENTRY_ID = 'a1000008-0008-4008-8008-000000000008';

/**
 * Story A — Northwind onsite travel, $1,240 (mirrors Expense Reports demo; live posts also flow
 * through the demo approval policy → Workflow Studio ledger step).
 */
export const DEMO_LEDGER_NORTHWIND_TRAVEL_ENTRY_ID = 'a1000009-0009-4009-8009-000000000009';

/** Fixed journal row ids from default + platform demo pack seeds (survive demo sync purge). */
export const CANONICAL_SEEDED_LEDGER_ENTRY_IDS: readonly string[] = [
  DEFAULT_LEDGER_JOURNAL_MARKER_ENTRY_ID,
  DEFAULT_LEDGER_SAMPLE_ENTRY_ID_2,
  DEFAULT_LEDGER_SAMPLE_ENTRY_ID_3,
  DEMO_LEDGER_JOURNAL_MARKER_ENTRY_ID,
  DEMO_LEDGER_NORTHWIND_ENTRY_ID,
  DEMO_LEDGER_SUMMIT_ENTRY_ID,
  DEMO_LEDGER_NORTHWIND_TRAVEL_ENTRY_ID,
];

/**
 * Ledger ↔ CRM company convention (plan §4, **option A**).
 *
 * `lab_ledger_accounts` is a chart of accounts, not a customer list, so a company can only
 * appear in the entry **memo**. The format is `{Company} — {What}` using the exact company
 * name from `DEMO_ACCOUNTS`, so the memo is greppable and reconcilable with the CRM deal.
 */
export const LEDGER_MEMO_COMPANIES = ['Northwind Labs', 'Summit Health'] as const;

const DEMO_PACK_JOURNAL_ENTRIES = [
  {
    id: DEMO_LEDGER_JOURNAL_MARKER_ENTRY_ID,
    occurredAt: '2026-09-20T16:00:00.000Z',
    memo: 'Demo pack: consulting revenue',
    lines: [
      { code: 'DEMO-CASH', side: 'debit' as const, amountCents: 25_000 },
      { code: 'DEMO-REV', side: 'credit' as const, amountCents: 25_000 },
    ],
  },
  {
    // Story A: the CRM Northwind deal posted as cash revenue, memo naming the account.
    id: DEMO_LEDGER_NORTHWIND_ENTRY_ID,
    occurredAt: '2026-09-28T15:00:00.000Z',
    memo: ledgerMemoForCompany('Northwind Labs', 'Platform Starter'),
    lines: [
      { code: 'DEMO-CASH', side: 'debit' as const, amountCents: 2_400_000 },
      { code: 'DEMO-REV', side: 'credit' as const, amountCents: 2_400_000 },
    ],
  },
  {
    // Story B: Summit Health support renewal.
    id: DEMO_LEDGER_SUMMIT_ENTRY_ID,
    occurredAt: '2026-10-06T11:30:00.000Z',
    memo: ledgerMemoForCompany('Summit Health', 'Premium Support'),
    lines: [
      { code: 'DEMO-CASH', side: 'debit' as const, amountCents: 199_000 },
      { code: 'DEMO-REV', side: 'credit' as const, amountCents: 199_000 },
    ],
  },
  {
    id: DEMO_LEDGER_NORTHWIND_TRAVEL_ENTRY_ID,
    occurredAt: '2026-10-10T13:00:00.000Z',
    memo: ledgerMemoForCompany('Northwind Labs', 'onsite travel (demo catalog)'),
    lines: [
      { code: '5000', side: 'debit' as const, amountCents: 124_000 },
      { code: '1000', side: 'credit' as const, amountCents: 124_000 },
    ],
  },
];

function accountIdForCode(code: string): string | null {
  const row = labLedgerRepository.getAccountIdByCode(code);
  return row ?? null;
}

function seedEntries(
  entries: Array<{
    id: string;
    occurredAt: string;
    memo: string;
    lines: Array<{ code: string; side: 'debit' | 'credit'; amountCents: number }>;
  }>,
  createdByUserId: number,
): boolean {
  let inserted = false;
  for (const entry of entries) {
    if (labLedgerRepository.getEntryById(entry.id)) {
      continue;
    }
    const lines = entry.lines.map((line) => {
      const accountId = accountIdForCode(line.code);
      if (!accountId) {
        return null;
      }
      return { accountId, side: line.side, amountCents: line.amountCents };
    });
    if (lines.some((line) => line == null)) {
      continue;
    }
    postBalancedEntryToRepository({
      id: entry.id,
      occurredAt: entry.occurredAt,
      memo: entry.memo,
      createdByUserId,
      lines: lines as Array<{ accountId: string; side: 'debit' | 'credit'; amountCents: number }>,
    });
    inserted = true;
  }
  return inserted;
}

/** Baseline journal activity when the ledger has accounts but no entries yet. */
export function seedDefaultLedgerJournalIfEmpty(createdByUserId = 1): boolean {
  const row = labLedgerRepository.countEntries();
  if ((row ?? 0) > 0) {
    return false;
  }
  return seedEntries(DEFAULT_JOURNAL_ENTRIES, createdByUserId);
}

/** Extra journal lines that use phase-2 demo accounts (DEMO-CASH / DEMO-REV). */
export function seedPlatformCatalogLedgerDemoJournalIfMissing(createdByUserId = 1): boolean {
  return seedEntries(DEMO_PACK_JOURNAL_ENTRIES, createdByUserId);
}

/** Re-insert missing default sample entries (idempotent). */
export function seedDefaultLedgerJournalIfMissing(createdByUserId = 1): boolean {
  return seedEntries(DEFAULT_JOURNAL_ENTRIES, createdByUserId);
}

/** Remove workflow/CRM/manual posts; keeps {@link CANONICAL_SEEDED_LEDGER_ENTRY_IDS} only. */
export function purgeNonCanonicalLedgerJournalEntries(): number {
  const keep = new Set(CANONICAL_SEEDED_LEDGER_ENTRY_IDS);
  let removed = 0;
  for (const id of labLedgerRepository.listAllEntryIds()) {
    if (keep.has(id)) {
      continue;
    }
    if (labLedgerRepository.deleteEntry(id)) {
      removed += 1;
    }
  }
  return removed;
}

export function deleteSeededLedgerEntries(entryIds: string[]): number {
  let removed = 0;
  for (const id of entryIds) {
    if (labLedgerRepository.deleteEntry(id)) {
      removed += 1;
    }
  }
  return removed;
}
