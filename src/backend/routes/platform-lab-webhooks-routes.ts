import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { labWorkflowWebhookCapturesRepository } from '../db/LabWorkflows/lab-workflow-webhook-captures-repository';
import { labWorkflowWebhooksRepository } from '../db/LabWorkflows/lab-workflow-webhooks-repository';
import { labWorkflowsRepository } from '../db/LabWorkflows/lab-workflows-repository';
import {
  LAB_WORKFLOW_WEBHOOK_MAX_PER_WORKFLOW,
  type LabWorkflowWebhookMode,
} from '@/shared/types/lab-workflow-webhook';
import { hashWebhookToken } from '@/shared/utils/lab-workflow-webhook-auth';
import { collectPayloadShapeFields } from '@/shared/utils/lab-workflow-payload-shape';
import { suggestedMappingFromShape } from '@/shared/utils/lab-workflow-trigger-mapping';

/**
 * Webhook management API for the designer (phase 37).
 *
 * ## The URLs are shown whenever the author looks at the endpoint
 *
 * Both secrets are stored, so the panel can render the test and live URLs on every load rather than
 * only in the response that minted them. Showing a URL once and never again means an author who
 * closes the dialog has lost it, and the only recovery is rotation — so they learn to re-create the
 * hook instead of using it.
 *
 * `viewer` never receives secrets: they cannot call the endpoint's mutating routes, and being handed
 * a working live URL would be the whole credential with none of the responsibility.
 *
 * ## Creating is never implicit
 *
 * A hook exists only because someone pressed create (or pressed regenerate). The demo seed no longer
 * mints one, because a URL nobody asked for is a credential nobody is watching.
 */

interface WorkflowParams {
  id: string;
}

function callerOf(request: FastifyRequest): User | null {
  return request.labUser ?? null;
}

/**
 * A webhook as the panel sees it.
 *
 * `testSecret` / `liveSecret` are `''` when the plaintext is not recoverable (a seeded hook, or a row
 * from before the secret was stored). The panel treats that as "regenerate to get a URL".
 */
function publicWebhook(row: {
  id: string;
  name: string;
  slug: string;
  eventType: string;
  enabled: boolean;
  hmacSecret: string | null;
  lastReceivedAt: string | null;
  mappingSourceJson: string | null;
  mappingSourceCapturedAt: string | null;
  testSecret: string;
  liveSecret: string;
}, caller: User) {
  // A viewer gets the shape of the endpoint but never a working URL.
  const maySeeSecrets = caller.role !== 'viewer';
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    eventType: row.eventType,
    enabled: row.enabled,
    /** Unsigned live hooks are flagged in the UI rather than blocked — see the phase's HMAC decision. */
    signed: Boolean(row.hmacSecret),
    lastReceivedAt: row.lastReceivedAt,
    mappingSourceJson: row.mappingSourceJson,
    mappingSourceCapturedAt: row.mappingSourceCapturedAt,
    testSecret: maySeeSecrets ? row.testSecret : '',
    liveSecret: maySeeSecrets ? row.liveSecret : '',
  };
}

/** Rotate one mode's secret. Shared by create (initial pair) shape and the regenerate route. */
function mintSecret(): string {
  return randomUUID().replace(/-/g, '');
}

export function registerPlatformLabWebhooksRoutes(server: FastifyInstance): void {
  /** List hooks + their latest test capture (the shape suggestions). */
  server.get(
    '/api/platform/lab-workflows/:id/webhooks',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest<{ Params: WorkflowParams }>, reply: FastifyReply) => {
      const caller = callerOf(request);
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const workflow = labWorkflowsRepository.getById(request.params.id);
      if (!workflow) {
        return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
      }

      const hooks = labWorkflowWebhooksRepository.listForWorkflow(workflow.id).map((hook) => {
        const latestTest = labWorkflowWebhookCapturesRepository.latestForMode(hook.id, 'test');
        const latestLive = labWorkflowWebhookCapturesRepository.latestForMode(hook.id, 'live');
        return {
          ...publicWebhook(hook, caller),
          latestTestShape: latestTest
            ? {
                capturedAt: latestTest.receivedAt,
                fields: collectPayloadShapeFields(JSON.parse(latestTest.payloadJson)),
              }
            : null,
          latestLiveShape: latestLive
            ? { capturedAt: latestLive.receivedAt }
            : null,
        };
      });

      return reply.send({ success: true, data: { webhooks: hooks } });
    },
  );

  /**
   * Create a hook with a fresh test/live pair.
   *
   * Both secrets are generated here and **returned once**. They are different values by construction,
   * so the mode split is real rather than a path convention.
   */
  server.post(
    '/api/platform/lab-workflows/:id/webhooks',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest<{ Params: WorkflowParams }>, reply: FastifyReply) => {
      const caller = callerOf(request);
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const workflow = labWorkflowsRepository.getById(request.params.id);
      if (!workflow) {
        return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
      }
      if (labWorkflowWebhooksRepository.countForWorkflow(workflow.id) >= LAB_WORKFLOW_WEBHOOK_MAX_PER_WORKFLOW) {
        return reply.status(400).send({
          success: false,
          error: 'LIMIT_REACHED',
          message: `A workflow may have at most ${LAB_WORKFLOW_WEBHOOK_MAX_PER_WORKFLOW} webhook triggers.`,
        });
      }

      const body = (request.body ?? {}) as {
        name?: unknown;
        slug?: unknown;
        triggerNodeId?: unknown;
        eventType?: unknown;
      };
      const triggerNodeId = typeof body.triggerNodeId === 'string' ? body.triggerNodeId.trim() : '';
      const eventType = typeof body.eventType === 'string' ? body.eventType.trim() : '';
      if (!triggerNodeId || !eventType) {
        return reply.status(400).send({
          success: false,
          error: 'INVALID_INPUT',
          message: 'triggerNodeId and eventType are required.',
        });
      }

      // Slug is legibility, so a collision is repaired rather than rejected: an author naming two hooks
      // "intake" should get `intake` and `intake-2`, not an error about a field that grants nothing.
      const wanted =
        (typeof body.slug === 'string' && body.slug.trim()) ||
        (typeof body.name === 'string' && body.name.trim()) ||
        'hook';
      const base = wanted
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'hook';
      let slug = base;
      let suffix = 2;
      while (labWorkflowWebhooksRepository.slugExists(slug)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
      }

      const testSecret = mintSecret();
      const liveSecret = mintSecret();
      const id = randomUUID();

      labWorkflowWebhooksRepository.insert({
        id,
        workflowId: workflow.id,
        triggerNodeId,
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Webhook trigger',
        slug,
        testTokenHash: hashWebhookToken(testSecret),
        liveTokenHash: hashWebhookToken(liveSecret),
        testSecret,
        liveSecret,
        hmacSecret: null,
        eventType,
        enabled: true,
      });

      return reply.send({
        success: true,
        data: {
          webhook: publicWebhook({
            id,
            name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Webhook trigger',
            slug,
            eventType,
            enabled: true,
            hmacSecret: null,
            lastReceivedAt: null,
            mappingSourceJson: null,
            mappingSourceCapturedAt: null,
            testSecret,
            liveSecret,
          }, caller),
          // The only time these exist in a response.
          secrets: { test: testSecret, live: liveSecret },
        },
      });
    },
  );

  /** Adopt a captured shape as the mapping source. */
  server.post(
    '/api/platform/lab-workflows/:id/webhooks/:webhookId/mapping-source',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (
      request: FastifyRequest<{ Params: WorkflowParams & { webhookId: string } }>,
      reply: FastifyReply,
    ) => {
      const caller = callerOf(request);
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const hook = labWorkflowWebhooksRepository.findById(request.params.id, request.params.webhookId);
      if (!hook) {
        return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
      }

      const body = (request.body ?? {}) as { mode?: unknown };
      const mode: LabWorkflowWebhookMode = body.mode === 'live' ? 'live' : 'test';
      const capture = labWorkflowWebhookCapturesRepository.latestForMode(hook.id, mode);
      if (!capture) {
        return reply.status(400).send({
          success: false,
          error: 'NO_CAPTURE',
          message: `No ${mode} payload has been captured yet. Call the ${mode} endpoint first.`,
        });
      }

      labWorkflowWebhooksRepository.setMappingSource(hook.id, {
        payloadJson: capture.payloadJson,
        fingerprint: capture.shapeFingerprint,
        capturedAt: capture.receivedAt,
      });

      const payload = JSON.parse(capture.payloadJson) as Record<string, unknown>;
      return reply.send({
        success: true,
        data: {
          capturedAt: capture.receivedAt,
          fields: collectPayloadShapeFields(payload),
          // Rows the author can start from. Never applied automatically — adopting a shape is not the
          // same as agreeing with a mapping.
          suggestedMapping: suggestedMappingFromShape(payload),
        },
      });
    },
  );

  /**
   * Regenerate one or both secrets.
   *
   * Explicit, never implicit: the old URL stops working the moment this returns, so it is a
   * deliberate act rather than something that happens on create. `mode: 'all'` is allowed because a
   * row whose plaintext is unknown (seeded, or pre-migration) has no usable URL in either mode and
   * two separate calls would half-fix it.
   */
  server.post(
    '/api/platform/lab-workflows/:id/webhooks/:webhookId/secrets',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (
      request: FastifyRequest<{ Params: WorkflowParams & { webhookId: string } }>,
      reply: FastifyReply,
    ) => {
      const caller = callerOf(request);
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const hook = labWorkflowWebhooksRepository.findById(request.params.id, request.params.webhookId);
      if (!hook) {
        return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
      }

      const body = (request.body ?? {}) as { mode?: unknown };
      const requested = body.mode === 'test' || body.mode === 'live' ? body.mode : 'all';
      const modes: LabWorkflowWebhookMode[] =
        requested === 'all' ? ['test', 'live'] : [requested];

      for (const mode of modes) {
        const secret = mintSecret();
        labWorkflowWebhooksRepository.setSecret(hook.workflowId, hook.id, mode, {
          tokenHash: hashWebhookToken(secret),
          secret,
        });
      }

      const updated = labWorkflowWebhooksRepository.findById(hook.workflowId, hook.id);
      return reply.send({
        success: true,
        data: { webhook: updated ? publicWebhook(updated, caller) : null },
      });
    },
  );

  server.delete(
    '/api/platform/lab-workflows/:id/webhooks/:webhookId',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (
      request: FastifyRequest<{ Params: WorkflowParams & { webhookId: string } }>,
      reply: FastifyReply,
    ) => {
      const caller = callerOf(request);
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      labWorkflowWebhooksRepository.delete(request.params.id, request.params.webhookId);
      return reply.send({ success: true });
    },
  );
}

declare module 'fastify' {
  interface FastifyRequest {
    labUser?: User;
  }
}
