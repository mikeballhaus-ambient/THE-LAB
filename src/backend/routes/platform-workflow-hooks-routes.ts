import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { labWorkflowWebhooksRepository } from '../db/LabWorkflows/lab-workflow-webhooks-repository';
import { labWorkflowsRepository } from '../db/LabWorkflows/lab-workflows-repository';
import { labEventsRepository } from '../db/LabEvents/lab-events-repository';
import { evaluateWorkflowGraphForDomainEvent } from '../lab-workflows/lab-workflow-graph-evaluator';
import { beginWorkflowRun } from '../lab-workflows/lab-workflow-run-recorder';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';
import {
  hashWebhookToken,
  parseWebhookPayload,
  verifyWebhookSignature,
} from '@/shared/utils/lab-workflow-webhook-auth';
import {
  LAB_WORKFLOW_WEBHOOK_MIN_INTERVAL_MS,
  LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS,
  LAB_WORKFLOW_WEBHOOK_SIGNATURE_HEADER,
  LAB_WORKFLOW_WEBHOOK_TIMESTAMP_HEADER,
} from '@/shared/types/lab-workflow-webhook';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';

/**
 * `POST /api/platform/hooks/:token` (W10a).
 *
 * ## Why this is unauthenticated by session
 *
 * The caller is an external system with no lab session — that is the point of a webhook. The token
 * identifies the workflow and the HMAC proves the caller, so there is nothing to authenticate against
 * the user table. The route therefore must not use `requirePlatformHttpUser`.
 *
 * ## The response deliberately says very little
 *
 * `202 accepted` with the run id, or a `401` with no detail. Reporting *why* a token failed
 * ("unknown", "disabled", "bad signature") would turn the endpoint into an oracle for guessing
 * tokens and for discovering which workflows exist. The reason is logged instead.
 *
 * ## Raw body, not parsed body
 *
 * The signature covers the exact bytes sent. Fastify's parsed body has been through JSON parsing and
 * key reordering, so signing that would reject legitimate callers whose serializer ordered keys
 * differently. `addContentTypeParser` below keeps the raw string for this route only.
 */

interface HookParams {
  token: string;
}

export function registerPlatformWorkflowHooksRoutes(server: FastifyInstance): void {
  // Registered as an **encapsulated plugin** so its content-type parser applies only to these routes.
  // `addContentTypeParser` on the root instance would replace JSON parsing for the whole server — the
  // platform APIs would then receive strings and every route would need to parse its own body.
  //
  // A real raw-body parser is required, not merely convenient: the HMAC covers the exact bytes the
  // caller sent. Re-serialising a parsed object would reorder keys and reject legitimate callers.
  void server.register(async (hooks) => {
    hooks.addContentTypeParser(
      ['application/json', 'text/plain', 'application/octet-stream'],
      { parseAs: 'string' },
      (_request, body, done) => {
        done(null, body);
      },
    );

    hooks.post<{ Params: HookParams }>(
      '/api/platform/hooks/:token',
      // No `preHandler` authentication: the token is the credential. `bodyLimit` bounds what an
      // unauthenticated caller can make the process buffer.
      { bodyLimit: 256 * 1024 },
      async (request: FastifyRequest<{ Params: HookParams }>, reply: FastifyReply) => {
      const token = request.params.token?.trim();
      if (!token) {
        return reply.status(401).send({ success: false, error: 'unauthorized' });
      }

      const webhook = labWorkflowWebhooksRepository.findByTokenHash(hashWebhookToken(token));
      if (!webhook) {
        // Unknown and disabled are the same answer on purpose.
        request.log.warn('[workflow-hooks] unknown or disabled token');
        return reply.status(401).send({ success: false, error: 'unauthorized' });
      }

      const rawBody = typeof request.body === 'string'
        ? request.body
        : request.body == null
          ? ''
          : JSON.stringify(request.body);

      if (webhook.hmacSecret) {
        const verification = verifyWebhookSignature({
          secret: webhook.hmacSecret,
          timestamp: headerValue(request, LAB_WORKFLOW_WEBHOOK_TIMESTAMP_HEADER),
          signature: headerValue(request, LAB_WORKFLOW_WEBHOOK_SIGNATURE_HEADER),
          rawBody,
          nowMs: Date.now(),
          windowMs: LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS,
        });
        if (!verification.ok) {
          // The *reason* goes to the log, not the response: `stale_timestamp` means a replay, which
          // is a security event an operator needs to see, while the caller learns nothing.
          //
          // Pino's signature is `(obj, msg)`, not `(msg, obj)` — the object first is what makes the
          // fields structured rather than interpolated into the message.
          request.log.warn(
            { webhookId: webhook.id, failure: verification.failure },
            '[workflow-hooks] signature rejected',
          );
          return reply.status(401).send({ success: false, error: 'unauthorized' });
        }
      }

      // Rate limit, checked after authentication: an unauthenticated caller must not be able to
      // consume a legitimate hook's budget, and must not learn the budget exists.
      const nowMs = Date.now();
      const lastMs = labWorkflowWebhookWebhookLastMs(webhook.id, webhook.workflowId);
      if (lastMs != null && nowMs - lastMs < LAB_WORKFLOW_WEBHOOK_MIN_INTERVAL_MS) {
        request.log.warn({ webhookId: webhook.id }, '[workflow-hooks] rate limited');
        return reply.status(429).send({ success: false, error: 'too_many_requests' });
      }

      const payload = parseWebhookPayload(rawBody);
      if (!payload) {
        return reply.status(400).send({ success: false, error: 'payload_must_be_an_object' });
      }

      const workflow = labWorkflowsRepository.getById(webhook.workflowId);
      if (!workflow || !workflow.enabled || !isLabWorkflowDefinitionV2(workflow.definition)) {
        // The hook outlived its workflow (or the workflow was disabled). Report success: retrying
        // will not help, and a webhook caller retrying forever is worse than a dropped call.
        request.log.warn({ webhookId: webhook.id }, '[workflow-hooks] workflow unavailable');
        return reply.status(202).send({ success: true, data: { ran: false } });
      }

      const envelope: LabDomainEventEnvelopeV1 = {
        schemaVersion: 1,
        id: randomUUID(),
        type: webhook.eventType,
        sourceAppId: 'platform-webhook',
        occurredAt: new Date(nowMs).toISOString(),
        actorUserId: workflow.ownerUserId ?? LAB_PLATFORM_SYSTEM_USER_ID,
        payload: { ...payload, webhookId: webhook.id },
      };

      // Persist before running, for the same reason the scheduler does: `lab_user_notifications
      // .event_id` is a foreign key, and a run whose notification rows were refused would report
      // success while notifying nobody.
      await labEventsRepository.publishEvent(
        envelope.id,
        envelope.type,
        envelope.sourceAppId,
        envelope.occurredAt,
        envelope.actorUserId ?? null,
        JSON.stringify(envelope.payload),
      );

      labWorkflowWebhooksRepository.markReceived(webhook.id, envelope.occurredAt, nowMs);

      const run = beginWorkflowRun({ workflowId: workflow.id, triggerType: 'webhook', envelope });
      try {
        await evaluateWorkflowGraphForDomainEvent(
          workflow.definition,
          envelope,
          workflow.name,
          workflow.scope,
          workflow.ownerUserId,
          { run, io: server.io },
        );
        run.finish();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'webhook workflow threw';
        request.log.error({ webhookId: webhook.id, err }, '[workflow-hooks] execution failed');
        run.finish('failed', message);
        // `202` still: the caller's job is delivery, and a retry would re-run a workflow that already
        // failed deterministically. The failure is visible in the run history instead.
      }

        return reply.status(202).send({ success: true, data: { runId: run.id } });
      },
    );
  });
}

/** Header lookup that tolerates `string[]` (a sender may repeat a header). */
function headerValue(request: FastifyRequest, name: string): string | undefined {
  const raw = request.headers[name];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return raw;
}

/** Thin indirection so the route reads as a decision, not as a repository call. */
function labWorkflowWebhookWebhookLastMs(id: string, workflowId: string): number | null {
  return labWorkflowWebhooksRepository.lastReceivedMs(id, workflowId);
}

declare module 'fastify' {
  interface FastifyInstance {
    io?: import('socket.io').Server;
  }
}
