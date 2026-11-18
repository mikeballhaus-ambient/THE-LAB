import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
// Side-effect import: the `fastify` module augmentation declaring `instance.io` is declared in this
// file, and TypeScript only sees it if the module is in the program.
import './platform-workflow-hooks-routes';
import { labWorkflowWebhookCapturesRepository } from '../db/LabWorkflows/lab-workflow-webhook-captures-repository';
import { labWorkflowWebhooksRepository } from '../db/LabWorkflows/lab-workflow-webhooks-repository';
import { labWorkflowsRepository } from '../db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '../db/LabWorkflows/lab-workflow-runs-repository';
import { labEventsRepository } from '../db/LabEvents/lab-events-repository';
import { evaluateWorkflowGraphForDomainEvent } from '../lab-workflows/lab-workflow-graph-evaluator';
import { beginWorkflowRun } from '../lab-workflows/lab-workflow-run-recorder';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowWebhookMode } from '@/shared/types/lab-workflow-webhook';
import {
  LAB_WORKFLOW_WEBHOOK_MIN_INTERVAL_MS,
  LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS,
  LAB_WORKFLOW_WEBHOOK_SIGNATURE_HEADER,
  LAB_WORKFLOW_WEBHOOK_TIMESTAMP_HEADER,
} from '@/shared/types/lab-workflow-webhook';
import {
  hashWebhookToken,
  parseWebhookPayload,
  verifyWebhookSignature,
} from '@/shared/utils/lab-workflow-webhook-auth';
import { fingerprintPayloadShape } from '@/shared/utils/lab-workflow-payload-shape';
import { applyTriggerOutputMapping } from '@/shared/utils/lab-workflow-trigger-mapping';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { captureWebhookDelivery } from '../lab-workflows/lab-workflow-listen-capture';

/**
 * Dedicated endpoint for **all** workflow webhook triggers (phase 37).
 *
 * ## Why a dedicated base URL
 *
 * The pre-37 route was `POST /api/platform/hooks/:token` — one flat path with one credential and no
 * notion of mode. An author needs a URL they can poke to see what a payload does **without notifying
 * anyone**, and a separate URL for production. That is a different routing problem, so it gets its own
 * router rather than another branch inside the platform API.
 *
 * ## Why the mode is not in the path
 *
 * ```
 * POST /api/hooks/workflows/:slug/:secret
 * ```
 *
 * `slug` is legibility only. The **secret decides the mode**, because the secret *is* the credential
 * and each mode has its own hash. There is no `test`/`live` segment for a caller to edit, so a leaked
 * test URL cannot be turned into a live one — which a single token with two paths would allow.
 *
 * ## Test mode is the existing `dryRun`
 *
 * Not a new notion of "test". A preview already means "describe the side effect instead of performing
 * it", and every side-effecting node honours it. Inventing a second mode would let the two drift.
 */

interface HookTriggerParams {
  slug: string;
  secret: string;
}

export function registerWorkflowWebhookTriggerRoutes(server: FastifyInstance): void {
  // Encapsulated plugin so the raw-body content-type parser applies here only. The HMAC covers the
  // exact bytes sent, so re-serialising a parsed body would reorder keys and reject legitimate callers.
  void server.register(async (hooks) => {
    hooks.addContentTypeParser(
      ['application/json', 'text/plain', 'application/octet-stream'],
      { parseAs: 'string' },
      (_request, body, done) => {
        done(null, body);
      },
    );

    hooks.post<{ Params: HookTriggerParams }>(
      '/api/hooks/workflows/:slug/:secret',
      // No authentication on purpose: the secret in the path is the credential. `bodyLimit` bounds
      // what an unauthenticated caller can make the process buffer.
      { bodyLimit: 256 * 1024 },
      async (request: FastifyRequest<{ Params: HookTriggerParams }>, reply: FastifyReply) => {
        const slug = request.params.slug?.trim() ?? '';
        const secret = request.params.secret?.trim() ?? '';
        if (!secret) {
          return reply.status(401).send({ success: false, error: 'unauthorized' });
        }

        const resolved = labWorkflowWebhooksRepository.resolveBySecret(hashWebhookToken(secret));
        if (!resolved) {
          // Unknown secret, disabled hook, and wrong secret on a valid slug are all the same answer:
          // anything else would make the endpoint an oracle for which slugs and secrets exist.
          request.log.warn('[workflow-webhooks] unknown secret');
          return reply.status(401).send({ success: false, error: 'unauthorized' });
        }

        // The slug is checked *after* authentication, and only to reject a mismatch. It never grants.
        if (resolved.webhook.slug && resolved.webhook.slug !== slug) {
          request.log.warn(
            { webhookId: resolved.webhook.id, slug },
            '[workflow-webhooks] slug does not match the secret',
          );
          return reply.status(401).send({ success: false, error: 'unauthorized' });
        }

        const { webhook, mode } = resolved;
        const rawBody = typeof request.body === 'string' ? request.body : '';
        const nowMs = Date.now();

        if (webhook.hmacSecret) {
          const verification = verifyWebhookSignature({
            secret: webhook.hmacSecret,
            timestamp: headerValue(request, LAB_WORKFLOW_WEBHOOK_TIMESTAMP_HEADER),
            signature: headerValue(request, LAB_WORKFLOW_WEBHOOK_SIGNATURE_HEADER),
            rawBody,
            nowMs,
            windowMs: LAB_WORKFLOW_WEBHOOK_REPLAY_WINDOW_MS,
          });
          if (!verification.ok) {
            // The reason goes to the log, not the response: `stale_timestamp` is a replay, a security
            // event an operator needs to see, while the caller learns nothing.
            request.log.warn(
              { webhookId: webhook.id, mode, failure: verification.failure },
              '[workflow-webhooks] signature rejected',
            );
            return reply.status(401).send({ success: false, error: 'unauthorized' });
          }
        }

        // Rate limit after authentication: an unauthenticated caller must not consume a legitimate
        // hook's budget, nor learn that a budget exists.
        const lastMs = labWorkflowWebhooksRepository.lastReceivedMs(webhook.id, webhook.workflowId);
        if (lastMs != null && nowMs - lastMs < LAB_WORKFLOW_WEBHOOK_MIN_INTERVAL_MS) {
          request.log.warn({ webhookId: webhook.id, mode }, '[workflow-webhooks] rate limited');
          return reply.status(429).send({ success: false, error: 'too_many_requests' });
        }

        const payload = parseWebhookPayload(rawBody);
        if (!payload) {
          return reply.status(400).send({ success: false, error: 'payload_must_be_an_object' });
        }

        const workflow = labWorkflowsRepository.getById(webhook.workflowId);
        if (!workflow || !workflow.enabled || !isLabWorkflowDefinitionV2(workflow.definition)) {
          request.log.warn({ webhookId: webhook.id }, '[workflow-webhooks] workflow unavailable');
          return reply.status(202).send({ success: true, data: { ran: false } });
        }

        // Capture before running: the capture is what the mapping panel reads, and a run that throws
        // must still leave the author the payload shape they waited for.
        const receivedAt = new Date(nowMs).toISOString();
        const payloadJson = JSON.stringify(payload);
        const fingerprint = fingerprintPayloadShape(payload);
        labWorkflowWebhookCapturesRepository.record({
          id: randomUUID(),
          webhookId: webhook.id,
          mode,
          payloadJson,
          shapeFingerprint: fingerprint,
          receivedAt,
        });

        // The mapping reduces the payload to the names downstream nodes expect. With no mapping the
        // body passes through unchanged, so pre-37 graphs behave exactly as they did.
        //
        // The *capture above* keeps the raw body: the author needs to see what the caller actually
        // sent in order to fix their mapping, and a projected payload would hide the field they
        // misspelled.
        const triggerNode = workflow.definition.nodes.find((node) => node.id === webhook.triggerNodeId);
        const mapping = triggerNode?.kind === 'trigger' ? triggerNode.mapping : undefined;
        const projected = applyTriggerOutputMapping(payload, mapping);

        const envelope: LabDomainEventEnvelopeV1 = {
          schemaVersion: 1,
          id: randomUUID(),
          type: webhook.eventType,
          sourceAppId: 'platform-webhook',
          occurredAt: receivedAt,
          actorUserId: workflow.ownerUserId ?? LAB_PLATFORM_SYSTEM_USER_ID,
          // `webhookId` is added **after** projection so a mapping cannot drop the one field the
          // platform itself needs to attribute the run.
          payload: { ...projected, webhookId: webhook.id },
        };

        // Persist before running: `lab_user_notifications.event_id` is a foreign key, so a run whose
        // notification rows were refused would report success while notifying nobody.
        await labEventsRepository.publishEvent(
          envelope.id,
          envelope.type,
          envelope.sourceAppId,
          envelope.occurredAt,
          envelope.actorUserId ?? null,
          JSON.stringify(envelope.payload),
        );

        labWorkflowWebhooksRepository.markReceived(webhook.id, receivedAt, nowMs);

        const run = beginWorkflowRun({ workflowId: workflow.id, triggerType: 'webhook', envelope });
        let runStatus = 'succeeded';
        try {
          await evaluateWorkflowGraphForDomainEvent(
            workflow.definition,
            envelope,
            workflow.name,
            workflow.scope,
            workflow.ownerUserId,
            {
              run,
              io: server.io,
              // **The mode, as one line.** `test` is the existing dry run: the graph is walked and
              // every side effect is described instead of performed.
              dryRun: mode === 'test',
              // A dry run records nothing as a run row by design, but this route wants the steps in
              // the panel so the author can see the path — `dryRun` keeps `runId` null, which the run
              // panel already renders as "Preview only".
            },
          );
          run.finish();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'webhook workflow threw';
          request.log.error({ webhookId: webhook.id, mode, err }, '[workflow-webhooks] execution failed');
          runStatus = 'failed';
          run.finish('failed', message);
          // `202` still: retrying would re-run a workflow that failed deterministically. The failure
          // is visible in run history instead.
        }

        // A delivery is how a webhook workflow's trigger fires, so an armed Listen must be satisfied
        // here — the bus capture in `publishLabDomainEventPipeline` never sees this event, because
        // the route evaluates directly rather than publishing. This runs **after** the graph has, so
        // it only records what arrived; it must not evaluate again or a live hook would notify twice.
        try {
          const captured = captureWebhookDelivery(envelope, {
            mode,
            // A preview writes no run row, which is what `runId: null` already means elsewhere.
            runId: mode === 'test' ? null : run.id,
            status: runStatus,
            // `evaluateWorkflowGraphForDomainEvent` returns void, but every executed node was written
            // to `lab_workflow_run_steps` through the handle, so the count is read back rather than
            // guessed. A read failure must not break the capture, so it degrades to 0.
            steps: countRecordedSteps(run.id),
          });
          if (captured) {
            request.log.info(
              { webhookId: webhook.id, workflowId: captured.workflowId },
              '[workflow-webhooks] armed listen satisfied',
            );
          }
        } catch (err) {
          // A capture is a debugging aid sitting in the delivery path; it must never turn an accepted
          // delivery into a failed one.
          request.log.warn(
            { webhookId: webhook.id, err },
            '[workflow-webhooks] listen capture failed',
          );
        }

        return reply.status(202).send({
          success: true,
          data: {
            runId: run.id,
            mode,
            // The shape is echoed so a caller can see what the mapping will address without opening
            // the editor. Values are not included — only paths.
            shapeFingerprint: fingerprint,
          },
        });
      },
    );
  });
}

/**
 * How many steps the run recorded.
 *
 * Read back from `lab_workflow_run_steps` because `evaluateWorkflowGraphForDomainEvent` resolves to
 * `void` — the run handle writes each node as it executes, so the rows are the only honest source.
 * A preview writes its rows too (the route opens a run either way), so both modes report a real count.
 *
 * Never throws: this feeds a diagnostic message, and a read failure must not fail the delivery.
 */
function countRecordedSteps(runId: string): number {
  try {
    return labWorkflowRunsRepository.listStepsForRun(runId).length;
  } catch {
    return 0;
  }
}

/** Header lookup that tolerates `string[]` (a sender may repeat a header). */
function headerValue(request: FastifyRequest, name: string): string | undefined {
  const raw = request.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Where a caller copies the two URLs from, and what the UI labels them. */
export function webhookTriggerUrls(
  baseUrl: string,
  webhook: { slug: string },
  secrets: { testSecret: string; liveSecret: string },
): { test: string; live: string } {
  const base = baseUrl.replace(/\/$/, '');
  return {
    test: `${base}/api/hooks/workflows/${webhook.slug}/${secrets.testSecret}`,
    live: `${base}/api/hooks/workflows/${webhook.slug}/${secrets.liveSecret}`,
  };
}

export type { LabWorkflowWebhookMode };
