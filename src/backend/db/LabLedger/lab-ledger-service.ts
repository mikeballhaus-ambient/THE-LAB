import { randomUUID } from 'node:crypto';
import type { Server as SocketIOServer } from 'socket.io';
import { labLedgerRepository } from './lab-ledger-repository';
import { postBalancedEntryToRepository } from './lab-ledger-posting';
import type { LabLedgerAccountRecord, LabLedgerEntryRecord } from '@/shared/types/lab-ledger';
import { LAB_LEDGER_SOURCE_APP_ID } from '@/shared/types/lab-ledger';
import {
  parseLabLedgerAccountCreate,
  parseLabLedgerAccountUpdate,
  parseLabLedgerEntryCreate,
} from '@/shared/types/schemas/lab-ledger-schema';
import type { User } from '@/shared/types/user';
import { isPlatformLedgerAccountAdmin } from '@/shared/utils/platform-ledger-permissions';
import { publishLabDomainEventPipeline } from '../../lab-events/publish-lab-domain-event-pipeline';
import { emitLabLedgerJournalChanged } from '../../lab-events/lab-events-notify';

export function isPlatformLedgerAdmin(user: User): boolean {
  return isPlatformLedgerAccountAdmin(user.role);
}

export class LabLedgerService {
  private static instance: LabLedgerService | null = null;

  private constructor() {}

  static getInstance(): LabLedgerService {
    if (!LabLedgerService.instance) {
      LabLedgerService.instance = new LabLedgerService();
    }
    return LabLedgerService.instance;
  }

  listAccountsForCaller(caller: User): LabLedgerAccountRecord[] {
    if (caller.role === 'viewer') {
      return [];
    }
    const accounts = labLedgerRepository.listAccounts();
    if (isPlatformLedgerAdmin(caller)) {
      return accounts;
    }
    return accounts.filter((a) => a.enabled);
  }

  createAccountForCaller(caller: User, body: unknown): LabLedgerAccountRecord {
    if (!isPlatformLedgerAdmin(caller)) {
      throw new LabLedgerError('FORBIDDEN', 'Only admins can manage accounts');
    }
    const parsed = parseLabLedgerAccountCreate(body);
    if (labLedgerRepository.codeExists(parsed.code)) {
      throw new LabLedgerError('INVALID_INPUT', 'Account code already exists');
    }
    const record: LabLedgerAccountRecord = {
      id: parsed.id,
      code: parsed.code,
      name: parsed.name,
      type: parsed.type,
      normalBalance: parsed.normalBalance,
      balanceCents: 0,
      enabled: parsed.enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    labLedgerRepository.insertAccount({
      id: record.id,
      code: record.code,
      name: record.name,
      type: record.type,
      normalBalance: record.normalBalance,
      enabled: record.enabled,
    });
    return record;
  }

  updateAccountForCaller(caller: User, accountId: string, body: unknown): LabLedgerAccountRecord {
    if (!isPlatformLedgerAdmin(caller)) {
      throw new LabLedgerError('FORBIDDEN', 'Only admins can manage accounts');
    }
    const existing = labLedgerRepository.getAccountById(accountId);
    if (!existing) {
      throw new LabLedgerError('NOT_FOUND', 'Account not found');
    }
    const parsed = parseLabLedgerAccountUpdate(body);
    const next: LabLedgerAccountRecord = {
      ...existing,
      code: parsed.code ?? existing.code,
      name: parsed.name ?? existing.name,
      type: parsed.type ?? existing.type,
      normalBalance: parsed.normalBalance ?? existing.normalBalance,
      enabled: parsed.enabled ?? existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    if (next.code !== existing.code && labLedgerRepository.codeExists(next.code)) {
      throw new LabLedgerError('INVALID_INPUT', 'Account code already exists');
    }
    labLedgerRepository.updateAccount(next);
    return next;
  }

  deleteAccountForCaller(caller: User, accountId: string): void {
    if (!isPlatformLedgerAdmin(caller)) {
      throw new LabLedgerError('FORBIDDEN', 'Only admins can manage accounts');
    }
    if (!labLedgerRepository.getAccountById(accountId)) {
      throw new LabLedgerError('NOT_FOUND', 'Account not found');
    }
    labLedgerRepository.deleteAccount(accountId);
  }

  listRecentEntriesForCaller(caller: User): LabLedgerEntryRecord[] {
    if (caller.role === 'viewer') {
      return [];
    }
    return labLedgerRepository.listRecentEntries();
  }

  async postEntryForCaller(
    caller: User,
    body: unknown,
    io?: SocketIOServer,
  ): Promise<LabLedgerEntryRecord> {
    if (caller.role === 'viewer') {
      throw new LabLedgerError('FORBIDDEN', 'Viewers cannot post entries');
    }
    const parsed = parseLabLedgerEntryCreate(body);
    let debitTotal = 0;
    for (const line of parsed.lines) {
      if (line.side === 'debit') {
        debitTotal += line.amountCents;
      }
    }

    const occurredAt = parsed.occurredAt ?? new Date().toISOString();
    try {
      postBalancedEntryToRepository({
        id: parsed.id,
        occurredAt,
        memo: parsed.memo ?? null,
        createdByUserId: caller.userId,
        lines: parsed.lines,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid entry';
      if (message.includes('not balanced')) {
        throw new LabLedgerError('INVALID_INPUT', message);
      }
      if (message.includes('Invalid or disabled account')) {
        throw new LabLedgerError('INVALID_INPUT', message);
      }
      throw err;
    }

    const entry = labLedgerRepository.getEntryById(parsed.id);
    if (!entry) {
      throw new LabLedgerError('INVALID_INPUT', 'Failed to load posted entry');
    }

    await publishLabDomainEventPipeline(
      {
        schemaVersion: 1,
        id: randomUUID(),
        type: 'platform-ledger.entry.posted',
        sourceAppId: LAB_LEDGER_SOURCE_APP_ID,
        occurredAt: new Date().toISOString(),
        actorUserId: caller.userId,
        payload: {
          entryId: entry.id,
          memo: entry.memo,
          lineCount: entry.lines.length,
          totalCents: debitTotal,
        },
      },
      caller.userId,
      io,
    );

    if (io) {
      emitLabLedgerJournalChanged(io);
    }

    return entry;
  }
}

export class LabLedgerError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_INPUT',
    message: string,
  ) {
    super(message);
    this.name = 'LabLedgerError';
  }
}

export const labLedgerService = LabLedgerService.getInstance();
