import { describe, expect, test, beforeAll } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { databaseManager } from '@/backend/db/DatabaseManager';
import { labLedgerRepository } from '@/backend/db/LabLedger/lab-ledger-repository';
import { postBalancedEntryToRepository } from '@/backend/db/LabLedger/lab-ledger-posting';
import {
  CANONICAL_SEEDED_LEDGER_ENTRY_IDS,
  DEMO_LEDGER_NORTHWIND_ENTRY_ID,
  purgeNonCanonicalLedgerJournalEntries,
} from '@/backend/db/LabLedger/lab-ledger-journal-seed';
import {
  DEMO_LEDGER_CASH_ID,
  purgeTestLedgerJournalEntriesOnDemoSync,
} from '@/backend/db/PlatformCatalog/platform-catalog-demo-seed';

describe('purge test ledger journal entries (demo sync)', () => {
  beforeAll(async () => {
    await databaseManager.initialize();
  });

  test('removes non-canonical entries when demo ledger pack is present', () => {
    expect(labLedgerRepository.getAccountById(DEMO_LEDGER_CASH_ID)).not.toBeNull();

    const cashId = labLedgerRepository.getAccountById(DEMO_LEDGER_CASH_ID)!.id;
    const rev = labLedgerRepository.listAccounts().find((a) => a.code === 'DEMO-REV');
    expect(rev).toBeDefined();

    const testEntryId = randomUUID();
    postBalancedEntryToRepository({
      id: testEntryId,
      occurredAt: '2026-10-28T12:00:00.000Z',
      memo: 'Manual test post — should purge on backend restart',
      createdByUserId: 1,
      lines: [
        { accountId: cashId, side: 'debit', amountCents: 100 },
        { accountId: rev!.id, side: 'credit', amountCents: 100 },
      ],
    });
    expect(labLedgerRepository.getEntryById(testEntryId)).not.toBeNull();

    const removed = purgeNonCanonicalLedgerJournalEntries();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(labLedgerRepository.getEntryById(testEntryId)).toBeNull();
    expect(labLedgerRepository.getEntryById(DEMO_LEDGER_NORTHWIND_ENTRY_ID)).not.toBeNull();
  });

  test('purgeTestLedgerJournalEntriesOnDemoSync is a no-op when nothing extra exists', () => {
    const db = databaseManager.getDb();
    const changed = purgeTestLedgerJournalEntriesOnDemoSync(db);
    expect(changed).toBe(false);
    for (const id of CANONICAL_SEEDED_LEDGER_ENTRY_IDS) {
      if (labLedgerRepository.getEntryById(id)) {
        expect(labLedgerRepository.getEntryById(id)).not.toBeNull();
      }
    }
  });
});
