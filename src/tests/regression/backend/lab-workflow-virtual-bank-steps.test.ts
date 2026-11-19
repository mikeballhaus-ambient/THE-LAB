import { afterEach, describe, expect, jest, test } from '@jest/globals';
import type { Server as SocketIOServer } from 'socket.io';
import { labVirtualBankRepository } from '@/backend/db/LabVirtualBank/lab-virtual-bank-repository';
import { runWorkflowStep } from '@/backend/lab-workflows/lab-workflow-step-runner';
import { LAB_VIRTUAL_BANK_DAILY_ACCRUAL } from '@/shared/types/lab-virtual-bank';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import { LAB_EVENTS_SOCKET } from '@/shared/types/lab-events-socket-events';
import { emitLabShellToastToUser } from '@/backend/lab-events/lab-events-toast';
import { LAB_EVENTS_SOCKET_NAMESPACE } from '@/backend/lab-events/lab-events-notify';
import type { WorkflowStepOutcome } from '@/backend/lab-workflows/lab-workflow-step-runner';

function expectWorkflowContinue(outcome: WorkflowStepOutcome) {
  if (outcome.kind !== 'continue') {
    throw new Error(`expected continue, got ${outcome.kind}`);
  }
  return outcome;
}

function sessionEnvelope(userId: number): LabDomainEventEnvelopeV1 {
  return {
    schemaVersion: 1,
    id: 'evt-session',
    type: 'platform-auth.session.established',
    sourceAppId: 'platform-auth',
    occurredAt: new Date().toISOString(),
    actorUserId: userId,
    payload: { userId, authMethod: 'password', utcDate: new Date().toISOString().slice(0, 10) },
  } as LabDomainEventEnvelopeV1;
}

describe('workflow virtual bank steps', () => {
  const userId = 7;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('virtual_bank_get_wallet enriches item json from eligibility helper', async () => {
    jest.spyOn(labVirtualBankRepository, 'evaluateDailyAllotmentEligibility').mockReturnValue({
      balance: 10_000,
      lastDailyAccrualDate: '2026-11-18',
      dailyAccrualAmount: LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
      balanceCap: 15_000,
      dailyAllotmentEligible: true,
      projectedAllotmentDelta: LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
    });

    const step: LabWorkflowStepV1 = { kind: 'virtual_bank_get_wallet', userIdPath: 'userId' };
    const outcome = await runWorkflowStep({
      step,
      envelope: sessionEnvelope(userId),
      workflowName: 'fixture',
      options: {},
    });

    const continued = expectWorkflowContinue(outcome);
    expect(continued.output.items[0]?.json).toMatchObject({
      userId,
      dailyAllotmentEligible: true,
      projectedAllotmentDelta: LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
    });
  });

  test('virtual_bank_credit_daily_allotment maps accrual onto items', async () => {
    jest.spyOn(labVirtualBankRepository, 'applyDailyAllotmentAccrual').mockReturnValue({
      account: { labUserId: userId, balance: 10_500, lastDailyAccrualDate: '2026-11-19' },
      accrualApplied: { delta: LAB_VIRTUAL_BANK_DAILY_ACCRUAL, days: 1 },
      ledgerEntryId: 42,
    });

    const step: LabWorkflowStepV1 = {
      kind: 'virtual_bank_credit_daily_allotment',
      userIdPath: 'userId',
    };
    const outcome = await runWorkflowStep({
      step,
      envelope: sessionEnvelope(userId),
      workflowName: 'fixture',
      items: [{ json: { userId } }],
      options: {},
    });

    const continued = expectWorkflowContinue(outcome);
    expect(continued.output.items[0]?.json).toMatchObject({
      accrualApplied: true,
      accrualDelta: LAB_VIRTUAL_BANK_DAILY_ACCRUAL,
      balanceAfter: 10_500,
      ledgerEntryId: 42,
    });
  });

  test('show_user_toast emits on lab-events user room', async () => {
    const emit = jest.fn<(...args: unknown[]) => void>();
    const to = jest
      .fn<(room: string) => { emit: typeof emit }>()
      .mockImplementation(() => ({ emit }));
    const of = jest
      .fn<(ns: string) => { to: typeof to }>()
      .mockImplementation(() => ({ to }));
    const io = { of } as unknown as SocketIOServer;

    emitLabShellToastToUser(io, userId, {
      severity: 'success',
      summary: 'Daily allotment',
      detail: '+500 Quarks',
    });

    expect(of).toHaveBeenCalledWith(LAB_EVENTS_SOCKET_NAMESPACE);
    expect(to).toHaveBeenCalledWith(`user:${userId}`);
    expect(emit).toHaveBeenCalledWith(
      LAB_EVENTS_SOCKET.USER_TOAST,
      expect.objectContaining({ userId, summary: 'Daily allotment' }),
    );

    const step: LabWorkflowStepV1 = {
      kind: 'show_user_toast',
      userIdPath: 'userId',
      severity: 'info',
      summary: 'No credit today',
    };
    const outcome = await runWorkflowStep({
      step,
      envelope: sessionEnvelope(userId),
      workflowName: 'fixture',
      items: [{ json: { userId } }],
      options: { io },
    });
    expect(outcome.kind).toBe('continue');
    expect(emit).toHaveBeenCalledTimes(2);
  });
});