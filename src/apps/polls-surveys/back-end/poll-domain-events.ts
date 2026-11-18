import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { VSCodeLogger } from '@/backend/utils/logger';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import type { PollsRepository } from './polls-repository';
import type { Poll, PollStatus } from '../shared/types';

async function discardPublishError(publishError: unknown): Promise<void> {
  const logger = await VSCodeLogger.getInstance();
  logger.warn(
    `[polls-surveys] lab-events publish skipped: ${
      publishError instanceof Error ? publishError.message : String(publishError)
    }`,
  );
}

/**
 * Side effects when poll status changes (REST PATCH, connector CRUD, or create-with-status).
 * Publish is modeled as `status: open` — no separate publish flag.
 */
export async function emitPollStatusDomainEvents(
  request: FastifyRequest,
  repo: PollsRepository,
  before: Poll | null | undefined,
  after: Poll,
): Promise<void> {
  const beforeStatus: PollStatus | undefined = before?.status;
  const openedNow = beforeStatus !== 'open' && after.status === 'open';
  const closedNow = beforeStatus !== 'closed' && after.status === 'closed';

  if (openedNow) {
    try {
      await publishLabDomainEvent(request, {
        schemaVersion: 1,
        id: randomUUID(),
        type: buildLabEventType('app-polls-surveys', 'poll', 'published'),
        sourceAppId: 'app-polls-surveys',
        occurredAt: new Date().toISOString(),
        actorUserId: resolveLabAppActorUserId(request),
        payload: {
          pollId: after.id,
          question: after.question,
          status: after.status,
          kind: after.kind,
        },
      });
    } catch (publishError: unknown) {
      await discardPublishError(publishError);
    }
  }

  if (!closedNow) {
    return;
  }

  const withResults = repo.list().find((row) => row.id === after.id) ?? null;
  const voteCount = withResults?.totalVotes ?? 0;
  const results = withResults?.options ?? [];
  const winningOption = results.reduce<{ label: string; votes: number } | null>(
    (best, option) => (best && best.votes >= option.votes ? best : option),
    null,
  );

  try {
    await publishLabDomainEvent(request, {
      schemaVersion: 1,
      id: randomUUID(),
      type: buildLabEventType('app-polls-surveys', 'poll', 'closed'),
      sourceAppId: 'app-polls-surveys',
      occurredAt: new Date().toISOString(),
      actorUserId: request ? resolveLabAppActorUserId(request) : undefined,
      payload: {
        pollId: after.id,
        question: after.question,
        status: after.status,
        voteCount,
      },
    });
  } catch (publishError: unknown) {
    await discardPublishError(publishError);
  }

  if (voteCount > 0) {
    try {
      await publishLabDomainEvent(request, {
        schemaVersion: 1,
        id: randomUUID(),
        type: buildLabEventType('app-polls-surveys', 'poll', 'results_ready'),
        sourceAppId: 'app-polls-surveys',
        occurredAt: new Date().toISOString(),
        actorUserId: resolveLabAppActorUserId(request),
        payload: {
          pollId: after.id,
          question: after.question,
          winningOption: winningOption?.label ?? null,
          voteCount,
        },
      });
    } catch (publishError: unknown) {
      await discardPublishError(publishError);
    }
  }
}
