import type { FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { VSCodeLogger } from '@/backend/utils/logger';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import type { ExpenseReport } from '../../shared/types';

export async function publishExpenseDomainEventsAfterStatusChange(
  request: FastifyRequest | undefined,
  before: ExpenseReport | null,
  expense: ExpenseReport,
): Promise<void> {
  if (!request) {
    return;
  }
  const actorUserId = resolveLabAppActorUserId(request);

  if (before?.status === 'draft' && expense.status === 'submitted') {
    try {
      await publishLabDomainEvent(request, {
        schemaVersion: 1,
        id: randomUUID(),
        type: buildLabEventType('app-expense-reports', 'expense', 'submitted'),
        sourceAppId: 'app-expense-reports',
        occurredAt: new Date().toISOString(),
        actorUserId,
        payload: {
          expenseId: expense.id,
          title: expense.title,
          submitter: expense.submitter,
          submitterId: expense.submitterId ?? null,
          amountCents: expense.amountCents,
          currency: expense.currency,
          category: expense.category,
        },
      });
    } catch (publishError: unknown) {
      const logger = await VSCodeLogger.getInstance();
      logger.warn(
        `[expense-reports] expense.submitted publish skipped: ${
          publishError instanceof Error ? publishError.message : String(publishError)
        }`,
      );
    }
  }

  if (before?.status !== 'approved' && expense.status === 'approved') {
    try {
      await publishLabDomainEvent(request, {
        schemaVersion: 1,
        id: randomUUID(),
        type: buildLabEventType('app-expense-reports', 'expense', 'approved'),
        sourceAppId: 'app-expense-reports',
        occurredAt: new Date().toISOString(),
        actorUserId,
        payload: {
          expenseId: expense.id,
          title: expense.title,
          submitter: expense.submitter,
          amountCents: expense.amountCents,
          currency: expense.currency,
          category: expense.category,
          status: expense.status,
        },
      });
    } catch (publishError: unknown) {
      const logger = await VSCodeLogger.getInstance();
      logger.warn(
        `[expense-reports] expense.approved publish skipped: ${
          publishError instanceof Error ? publishError.message : String(publishError)
        }`,
      );
    }
  }
}
