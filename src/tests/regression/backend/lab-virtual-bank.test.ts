import { databaseManager } from '@/backend/db/DatabaseManager';
import { labVirtualBankRepository } from '@/backend/db/LabVirtualBank/lab-virtual-bank-repository';
import { labVirtualBankService } from '@/backend/db/LabVirtualBank/lab-virtual-bank-service';
import {
  LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
  LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP,
  LAB_VIRTUAL_BANK_STARTING_BALANCE,
} from '@/shared/types/lab-virtual-bank';

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function utcYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateString(d);
}

describe('lab virtual bank', () => {
  const userId = 1;

  beforeAll(async () => {
    await databaseManager.initialize();
  });

  test('opens account with starting balance', () => {
    const view = labVirtualBankService.getAccountView(userId);
    expect(view.balance).toBeGreaterThanOrEqual(LAB_VIRTUAL_BANK_STARTING_BALANCE);
    expect(view.dailyAccrualAmount).toBe(LAB_VIRTUAL_BANK_DAILY_ACCRUAL);
  });

  test('allows negative balance', () => {
    const before = labVirtualBankService.getAccountView(userId).balance;
    const result = labVirtualBankService.adjust({
      userId,
      delta: -(before + 500),
      reasonCode: 'manual_adjustment',
      reasonLabel: 'Test overdraft',
    });
    expect(result.balance).toBeLessThan(0);
  });

  test('records ledger entries', () => {
    const entries = labVirtualBankService.listLedger(userId, 5);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.balanceAfter).toBe(labVirtualBankService.getAccountView(userId).balance);
  });

  test('hint_purchase debits balance', () => {
    const before = labVirtualBankService.getAccountView(userId).balance;
    const result = labVirtualBankService.adjust({
      userId,
      delta: -50,
      reasonCode: 'hint_purchase',
      reasonLabel: 'Shot path preview (app-billiards)',
      sourceAppId: 'app-billiards',
      sourceRef: `hint:test:${Date.now()}`,
    });
    expect(result.balance).toBe(before - 50);
    const entries = labVirtualBankService.listLedger(userId, 3);
    expect(entries[0]?.reasonCode).toBe('hint_purchase');
  });

  test('skips duplicate adjust for same user and sourceRef', () => {
    const sourceRef = `test-idempotent-${Date.now()}`;
    const first = labVirtualBankService.adjust({
      userId,
      delta: 42,
      reasonCode: 'activity_reward',
      reasonLabel: 'Test activity',
      sourceAppId: 'app-suggestion-box',
      sourceRef,
    });
    const second = labVirtualBankService.adjust({
      userId,
      delta: 42,
      reasonCode: 'activity_reward',
      reasonLabel: 'Test activity duplicate',
      sourceAppId: 'app-suggestion-box',
      sourceRef,
    });
    expect(second.skippedDuplicate).toBe(true);
    expect(second.balance).toBe(first.balance);
    expect(second.ledgerEntryId).toBe(first.ledgerEntryId);
  });

  describe('daily accrual balance cap', () => {
    test('still accrues normally below cap', () => {
      labVirtualBankRepository.updateAccountBalance(userId, 5_000, utcYesterday());

      const { account, accrualApplied } = labVirtualBankRepository.ensureAccountWithAccrual(userId);
      expect(accrualApplied?.delta).toBe(LAB_VIRTUAL_BANK_DAILY_ACCRUAL);
      expect(account.balance).toBe(5_000 + LAB_VIRTUAL_BANK_DAILY_ACCRUAL);
    });

    test('credits only up to cap headroom', () => {
      const headroomStart = LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP - 120;
      labVirtualBankRepository.updateAccountBalance(userId, headroomStart, utcYesterday());

      const { account, accrualApplied } = labVirtualBankRepository.ensureAccountWithAccrual(userId);
      expect(accrualApplied?.delta).toBe(120);
      expect(account.balance).toBe(LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP);
    });

    test('skips daily accrual at or above cap', () => {
      labVirtualBankRepository.updateAccountBalance(
        userId,
        LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP,
        utcYesterday(),
      );

      const { account, accrualApplied } = labVirtualBankRepository.ensureAccountWithAccrual(userId);
      expect(accrualApplied).toBeNull();
      expect(account.balance).toBe(LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP);
      expect(account.lastDailyAccrualDate).toBe(utcDateString());
    });
  });
});
