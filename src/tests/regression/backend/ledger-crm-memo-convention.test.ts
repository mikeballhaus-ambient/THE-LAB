import { describe, expect, test } from '@jest/globals';
import {
  LEDGER_MEMO_COMPANIES,
  ledgerMemoForCompany,
} from '@/backend/db/LabLedger/lab-ledger-journal-seed';
import { DEMO_ACCOUNTS, isDemoAccountName } from '@/shared/config/demo-data-cast';

/**
 * Ledger ↔ CRM reconciliation, plan §4 **option A**.
 *
 * `lab_ledger_accounts` is a chart of accounts with no customer dimension, so a company can
 * only appear in `lab_ledger_entries.memo`. The convention is enforced here rather than by a
 * foreign key: `"{Company} — {What}"` using the exact canonical company name.
 */
describe('ledger memo convention', () => {
  test('memos use the canonical em-dash format', () => {
    expect(ledgerMemoForCompany('Northwind Labs', 'Platform Starter')).toBe(
      'Northwind Labs — Platform Starter',
    );
    expect(ledgerMemoForCompany('Summit Health', 'Premium Support')).toBe(
      'Summit Health — Premium Support',
    );
  });

  test('every memo company is a canonical account, not an invented name', () => {
    for (const company of LEDGER_MEMO_COMPANIES) {
      expect({ company, ok: isDemoAccountName(company) }).toEqual({ company, ok: true });
    }
  });

  test('the two story accounts are the hero accounts', () => {
    expect(DEMO_ACCOUNTS).toContain('Northwind Labs');
    expect(DEMO_ACCOUNTS).toContain('Summit Health');
    expect(LEDGER_MEMO_COMPANIES).toEqual(['Northwind Labs', 'Summit Health']);
  });

  test('memo starts with the company name so it is greppable', () => {
    for (const company of LEDGER_MEMO_COMPANIES) {
      const memo = ledgerMemoForCompany(company, 'something');
      expect(memo.startsWith(company)).toBe(true);
      expect(memo).toContain(' — ');
    }
  });
});
