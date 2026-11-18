import type {
  LabVirtualBankAccountView,
  LabVirtualBankAdjustRequest,
  LabVirtualBankAdjustResult,
  LabVirtualBankLedgerEntry,
} from '@/shared/types/lab-virtual-bank';
import {
  LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
  LAB_VIRTUAL_BANK_STARTING_BALANCE,
} from '@/shared/types/lab-virtual-bank';
import { labVirtualBankRepository } from './lab-virtual-bank-repository';

export class LabVirtualBankService {
  private static instance: LabVirtualBankService;

  static getInstance(): LabVirtualBankService {
    if (!LabVirtualBankService.instance) {
      LabVirtualBankService.instance = new LabVirtualBankService();
    }
    return LabVirtualBankService.instance;
  }

  getAccountView(labUserId: number): LabVirtualBankAccountView {
    const { account, accrualApplied } = labVirtualBankRepository.ensureAccountWithAccrual(labUserId);
    return {
      balance: account.balance,
      lastDailyAccrualDate: account.lastDailyAccrualDate,
      dailyAccrualAmount: LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
      startingBalance: LAB_VIRTUAL_BANK_STARTING_BALANCE,
      accruedThisRequest: accrualApplied ?? undefined,
    };
  }

  listLedger(labUserId: number, limit = 25): LabVirtualBankLedgerEntry[] {
    labVirtualBankRepository.ensureAccountWithAccrual(labUserId);
    return labVirtualBankRepository.listLedger(labUserId, limit).map((row) => ({
      id: row.id,
      delta: row.delta,
      balanceAfter: row.balanceAfter,
      reasonCode: row.reasonCode as LabVirtualBankLedgerEntry['reasonCode'],
      reasonLabel: row.reasonLabel,
      sourceAppId: row.sourceAppId,
      sourceRef: row.sourceRef,
      createdAt: row.createdAt,
    }));
  }

  adjust(request: LabVirtualBankAdjustRequest): LabVirtualBankAdjustResult {
    if (!Number.isFinite(request.delta) || request.delta === 0) {
      throw new Error('Virtual bank adjustment requires a non-zero delta');
    }
    if (!Number.isFinite(request.userId) || request.userId < 1) {
      throw new Error('Invalid user id');
    }
    const sourceRef = request.sourceRef?.trim();
    if (sourceRef) {
      const existing = labVirtualBankRepository.findLedgerEntryBySourceRef(request.userId, sourceRef);
      if (existing) {
        const account = labVirtualBankRepository.getAccount(request.userId);
        return {
          balance: account?.balance ?? existing.balanceAfter,
          ledgerEntryId: existing.id,
          skippedDuplicate: true,
        };
      }
    }
    const result = labVirtualBankRepository.applyDelta({
      labUserId: request.userId,
      delta: Math.trunc(request.delta),
      reasonCode: request.reasonCode,
      reasonLabel: request.reasonLabel,
      sourceAppId: request.sourceAppId,
      sourceRef: sourceRef || request.sourceRef,
      metadataJson: request.metadata ? JSON.stringify(request.metadata) : undefined,
    });
    return { balance: result.balance, ledgerEntryId: result.ledgerEntryId };
  }
}

export const labVirtualBankService = LabVirtualBankService.getInstance();
