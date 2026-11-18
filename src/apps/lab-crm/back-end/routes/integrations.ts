import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { VSCodeLogger } from '@/backend/utils/logger';
import { CRM_APP_REGISTRY_ID } from '../../shared/constants/app-scope';
import { CRM_DEAL_ENTITY_KEYS } from '../../shared/constants/crm-integration-slots';
import { crmApprovalSubmittedEventType } from '../utils/crm-approval-event-types';
import { crmLedgerPostRequestedEventType } from '../utils/crm-ledger-event-types';
import { buildCrmLedgerPostEventFields } from '../utils/crm-ledger-event-context';
import { EntityRecordService } from '../services/entity-record-service';

const SubmitApprovalSchema = z.object({
  entityKey: z.string().min(1),
  recordId: z.number().int().positive(),
  recordLabel: z.string().max(500).optional(),
  comment: z.string().max(2000).optional(),
  stage: z.string().max(120).optional(),
});

const PostLedgerSchema = z.object({
  entityKey: z.string().min(1),
  recordId: z.number().int().positive(),
  recordLabel: z.string().max(500).optional(),
  memo: z.string().max(500).optional(),
  amountCents: z.number().int().nonnegative().optional(),
});

async function logPublishFailure(context: string, publishError: unknown): Promise<void> {
  const logger = await VSCodeLogger.getInstance();
  logger.warn(
    `[crm] ${context} event publish failed: ${
      publishError instanceof Error ? publishError.message : String(publishError)
    }`,
  );
}

export default async function integrationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/integrations/approval-request/submit', async (request, reply) => {
    const parsed = SubmitApprovalSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    const { entityKey, recordId, recordLabel, comment, stage } = parsed.data;
    if (!CRM_DEAL_ENTITY_KEYS.has(entityKey)) {
      return reply.status(400).send({
        error: `Approval submit is only supported for entity keys: ${[...CRM_DEAL_ENTITY_KEYS].join(', ')}`,
      });
    }
    const eventType = crmApprovalSubmittedEventType(entityKey);
    if (!eventType) {
      return reply.status(400).send({ error: 'Unsupported entity for approval submit' });
    }

    const actorUserId = resolveLabAppActorUserId(request);
    const title =
      recordLabel?.trim()
        ? `Approval: ${recordLabel.trim()}`
        : `Approval for ${entityKey} #${recordId}`;

    try {
      await publishLabDomainEvent(request, {
        schemaVersion: 1,
        id: randomUUID(),
        type: eventType,
        sourceAppId: CRM_APP_REGISTRY_ID,
        occurredAt: new Date().toISOString(),
        actorUserId,
        payload: {
          entityKey,
          recordId,
          recordLabel: recordLabel?.trim() || undefined,
          title,
          comment: comment?.trim() || undefined,
          stage: stage?.trim() || undefined,
          subjectAppId: CRM_APP_REGISTRY_ID,
          subjectEntityType: entityKey,
          subjectEntityId: String(recordId),
        },
      });
    } catch (publishError: unknown) {
      await logPublishFailure('approval submit', publishError);
      return reply.status(502).send({
        error: 'Could not publish approval request event. Check platform backend and Workflow Studio demos.',
      });
    }

    const updateResult = await EntityRecordService.getInstance().update(entityKey, recordId, {
      approvalStatus: 'pending',
    });
    if (updateResult.notFound) {
      return reply.status(404).send({ error: 'CRM record not found' });
    }
    if (updateResult.errors?.length) {
      await logPublishFailure(
        'approval submit record update',
        new Error(updateResult.errors.join('; ')),
      );
      return reply.status(502).send({
        error: 'Approval was requested but the deal record could not be marked pending.',
      });
    }

    return reply.send({ success: true, approvalStatus: 'pending' });
  });

  fastify.post('/integrations/ledger-entry/post', async (request, reply) => {
    const parsed = PostLedgerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    const { entityKey, recordId, recordLabel, memo, amountCents } = parsed.data;
    if (!CRM_DEAL_ENTITY_KEYS.has(entityKey)) {
      return reply.status(400).send({
        error: `Ledger post is only supported for entity keys: ${[...CRM_DEAL_ENTITY_KEYS].join(', ')}`,
      });
    }
    const eventType = crmLedgerPostRequestedEventType(entityKey);
    if (!eventType) {
      return reply.status(400).send({ error: 'Unsupported entity for ledger post' });
    }

    const actorUserId = resolveLabAppActorUserId(request);
    const ledgerContext = await buildCrmLedgerPostEventFields({
      entityKey,
      recordId,
      recordLabel,
      userMemo: memo,
    });

    try {
      await publishLabDomainEvent(request, {
        schemaVersion: 1,
        id: randomUUID(),
        type: eventType,
        sourceAppId: CRM_APP_REGISTRY_ID,
        occurredAt: new Date().toISOString(),
        actorUserId,
        payload: {
          entityKey,
          recordId,
          recordLabel: recordLabel?.trim() || ledgerContext.dealLabel,
          accountName: ledgerContext.accountName,
          dealLabel: ledgerContext.dealLabel,
          ledgerMemo: ledgerContext.ledgerMemo,
          memo: ledgerContext.eventMemo,
          amountCents: amountCents ?? 10_000,
          subjectAppId: CRM_APP_REGISTRY_ID,
          subjectEntityType: entityKey,
          subjectEntityId: String(recordId),
        },
      });
    } catch (publishError: unknown) {
      await logPublishFailure('ledger post', publishError);
      return reply.status(502).send({
        error: 'Could not publish ledger post event. Check platform backend and Workflow Studio demos.',
      });
    }

    return reply.send({ success: true });
  });
}
