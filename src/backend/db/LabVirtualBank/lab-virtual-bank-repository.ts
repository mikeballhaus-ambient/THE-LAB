import { randomUUID } from 'node:crypto';
import { Repository } from '../Repository';
import {
  CREATE_LAB_VIRTUAL_BANK_ACCOUNTS,
  CREATE_LAB_VIRTUAL_BANK_LEDGER,
  CREATE_LAB_VIRTUAL_BANK_LEDGER_INDEX,
  LAB_VIRTUAL_BANK_ACCOUNTS_TABLE,
  LAB_VIRTUAL_BANK_LEDGER_TABLE,
} from './lab-virtual-bank-schema';
import type { LabVirtualBankReasonCode } from '@/shared/types/lab-virtual-bank';
import {
  LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
  LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP,
  LAB_VIRTUAL_BANK_MAX_ACCRUAL_DAYS,
  LAB_VIRTUAL_BANK_STARTING_BALANCE,
} from '@/shared/types/lab-virtual-bank';
import { LAB_QUARKS_CURRENCY } from '@/shared/constants/lab-quarks-currency';

export interface VirtualBankAccountRow {
  labUserId: number;
  balance: number;
  lastDailyAccrualDate: string;
}

export interface VirtualBankAccrualApplied {
  delta: number;
  days: number;
}

export interface EnsureVirtualBankAccountResult {
  account: VirtualBankAccountRow;
  accrualApplied: VirtualBankAccrualApplied | null;
}

export interface ApplyDeltaParams {
  labUserId: number;
  delta: number;
  reasonCode: LabVirtualBankReasonCode;
  reasonLabel: string;
  sourceAppId?: string;
  sourceRef?: string;
  metadataJson?: string;
}

function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function parseUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function daysBetweenUtc(start: string, end: string): number {
  const a = parseUtcDate(start).getTime();
  const b = parseUtcDate(end).getTime();
  const diff = Math.floor((b - a) / 86_400_000);
  return diff > 0 ? diff : 0;
}

export class LabVirtualBankRepository extends Repository {
  close(): void {
    /* prepared per call */
  }

  async initialize(): Promise<void> {
    this.db.exec(CREATE_LAB_VIRTUAL_BANK_ACCOUNTS);
    this.db.exec(CREATE_LAB_VIRTUAL_BANK_LEDGER);
    this.db.exec(CREATE_LAB_VIRTUAL_BANK_LEDGER_INDEX);
  }

  getAccount(labUserId: number): VirtualBankAccountRow | null {
    const row = this.db
      .prepare(
        `SELECT lab_user_id, balance, last_daily_accrual_date
         FROM ${LAB_VIRTUAL_BANK_ACCOUNTS_TABLE} WHERE lab_user_id = ?`,
      )
      .get(labUserId) as
      | { lab_user_id: number; balance: number; last_daily_accrual_date: string }
      | undefined;
    if (!row) {
      return null;
    }
    return {
      labUserId: row.lab_user_id,
      balance: row.balance,
      lastDailyAccrualDate: row.last_daily_accrual_date,
    };
  }

  insertAccount(labUserId: number, balance: number, lastDailyAccrualDate: string): void {
    this.db
      .prepare(
        `INSERT INTO ${LAB_VIRTUAL_BANK_ACCOUNTS_TABLE}
         (lab_user_id, balance, last_daily_accrual_date, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(labUserId, balance, lastDailyAccrualDate);
  }

  updateAccountBalance(labUserId: number, balance: number, lastDailyAccrualDate: string): void {
    this.db
      .prepare(
        `UPDATE ${LAB_VIRTUAL_BANK_ACCOUNTS_TABLE}
         SET balance = ?, last_daily_accrual_date = ?, updated_at = datetime('now')
         WHERE lab_user_id = ?`,
      )
      .run(balance, lastDailyAccrualDate, labUserId);
  }

  insertLedgerEntry(params: ApplyDeltaParams & { balanceAfter: number }): number {
    const result = this.db
      .prepare(
        `INSERT INTO ${LAB_VIRTUAL_BANK_LEDGER_TABLE}
         (lab_user_id, delta, balance_after, reason_code, reason_label, source_app_id, source_ref, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.labUserId,
        params.delta,
        params.balanceAfter,
        params.reasonCode,
        params.reasonLabel,
        params.sourceAppId ?? null,
        params.sourceRef ?? null,
        params.metadataJson ?? null,
      );
    return Number(result.lastInsertRowid);
  }

  findLedgerEntryBySourceRef(
    labUserId: number,
    sourceRef: string,
  ): { id: number; balanceAfter: number } | null {
    const row = this.db
      .prepare(
        `SELECT id, balance_after FROM ${LAB_VIRTUAL_BANK_LEDGER_TABLE}
         WHERE lab_user_id = ? AND source_ref = ?
         LIMIT 1`,
      )
      .get(labUserId, sourceRef) as { id: number; balance_after: number } | undefined;
    if (!row) {
      return null;
    }
    return { id: row.id, balanceAfter: row.balance_after };
  }

  listLedger(labUserId: number, limit: number): Array<{
    id: number;
    delta: number;
    balanceAfter: number;
    reasonCode: string;
    reasonLabel: string;
    sourceAppId: string | null;
    sourceRef: string | null;
    createdAt: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, delta, balance_after, reason_code, reason_label, source_app_id, source_ref, created_at
         FROM ${LAB_VIRTUAL_BANK_LEDGER_TABLE}
         WHERE lab_user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .all(labUserId, limit) as Array<{
      id: number;
      delta: number;
      balance_after: number;
      reason_code: string;
      reason_label: string;
      source_app_id: string | null;
      source_ref: string | null;
      created_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      delta: row.delta,
      balanceAfter: row.balance_after,
      reasonCode: row.reason_code,
      reasonLabel: row.reason_label,
      sourceAppId: row.source_app_id,
      sourceRef: row.source_ref,
      createdAt: row.created_at,
    }));
  }

  /** Opening balance + optional daily catch-up in one transaction. */
  ensureAccountWithAccrual(labUserId: number): EnsureVirtualBankAccountResult {
    const today = utcDateString();
    const existing = this.getAccount(labUserId);
    if (!existing) {
      this.db.transaction(() => {
        this.insertAccount(labUserId, LAB_VIRTUAL_BANK_STARTING_BALANCE, today);
        this.insertLedgerEntry({
          labUserId,
          delta: LAB_VIRTUAL_BANK_STARTING_BALANCE,
          balanceAfter: LAB_VIRTUAL_BANK_STARTING_BALANCE,
          reasonCode: 'account_opening',
          reasonLabel: LAB_QUARKS_CURRENCY.welcomeCreditLabel,
          sourceRef: randomUUID(),
        });
      })();
      return {
        account: this.getAccount(labUserId)!,
        accrualApplied: null,
      };
    }

    if (existing.lastDailyAccrualDate >= today) {
      return { account: existing, accrualApplied: null };
    }

    const days = Math.min(
      daysBetweenUtc(existing.lastDailyAccrualDate, today),
      LAB_VIRTUAL_BANK_MAX_ACCRUAL_DAYS,
    );
    if (days <= 0) {
      this.updateAccountBalance(labUserId, existing.balance, today);
      return {
        account: { ...existing, lastDailyAccrualDate: today },
        accrualApplied: null,
      };
    }

    if (existing.balance >= LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP) {
      this.updateAccountBalance(labUserId, existing.balance, today);
      return {
        account: { ...existing, lastDailyAccrualDate: today },
        accrualApplied: null,
      };
    }

    const rawCredit = days * LAB_VIRTUAL_BANK_DAILY_ACCRUAL;
    const headroom = LAB_VIRTUAL_BANK_DAILY_ACCRUAL_BALANCE_CAP - existing.balance;
    const credit = Math.min(rawCredit, headroom);
    if (credit <= 0) {
      this.updateAccountBalance(labUserId, existing.balance, today);
      return {
        account: { ...existing, lastDailyAccrualDate: today },
        accrualApplied: null,
      };
    }

    const daysForUi =
      credit >= rawCredit ? days : Math.max(1, Math.ceil(credit / LAB_VIRTUAL_BANK_DAILY_ACCRUAL));
    const newBalance = existing.balance + credit;
    this.db.transaction(() => {
      this.updateAccountBalance(labUserId, newBalance, today);
      this.insertLedgerEntry({
        labUserId,
        delta: credit,
        balanceAfter: newBalance,
        reasonCode: 'daily_accrual',
        reasonLabel:
          daysForUi === 1
            ? LAB_QUARKS_CURRENCY.dailyAccrualLabel
            : `${LAB_QUARKS_CURRENCY.dailyAccrualMultiDayLabel} (${daysForUi} days)`,
        metadataJson: JSON.stringify({ daysAccrued: daysForUi, daysEligible: days }),
      });
    })();
    return {
      account: this.getAccount(labUserId)!,
      accrualApplied: { delta: credit, days: daysForUi },
    };
  }

  applyDelta(params: ApplyDeltaParams): { balance: number; ledgerEntryId: number } {
    const { account } = this.ensureAccountWithAccrual(params.labUserId);
    const balanceAfter = account.balance + params.delta;
    let ledgerEntryId = 0;
    this.db.transaction(() => {
      this.updateAccountBalance(
        params.labUserId,
        balanceAfter,
        account.lastDailyAccrualDate,
      );
      ledgerEntryId = this.insertLedgerEntry({
        ...params,
        balanceAfter,
      });
    })();
    return { balance: balanceAfter, ledgerEntryId };
  }
}

export const labVirtualBankRepository = new LabVirtualBankRepository();
