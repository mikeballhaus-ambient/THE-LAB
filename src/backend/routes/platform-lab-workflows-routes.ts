import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { LabWorkflowsError, labWorkflowsService } from '../db/LabWorkflows/lab-workflows-service';
import { LabDomainEventPublishSchema } from '@/shared/types/schemas/lab-domain-event-schema';
import type { LabWorkflowScope } from '@/shared/types/lab-workflow';
import {
  armListen,
  disarmListen,
  getListen,
  LAB_WORKFLOW_LISTEN_TTL_MS,
} from '@/shared/types/lab-workflow-listen';
import { getWorkflowTriggerEventType } from '@/shared/utils/lab-workflow-definition';

declare module 'fastify' {
  interface FastifyRequest {
    labUser?: User;
  }
}

function mapWorkflowsError(reply: FastifyReply, err: unknown) {
  if (err instanceof LabWorkflowsError) {
    const status =
      err.code === 'NOT_FOUND'
        ? 404
        : err.code === 'FORBIDDEN'
          ? 403
          : err.code === 'LIMIT' || err.code === 'INVALID_INPUT'
            ? 400
            : 400;
    return reply.status(status).send({ success: false, error: err.code, message: err.message });
  }
  throw err;
}

export function registerPlatformLabWorkflowsRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/lab-workflows',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const query = request.query as { scope?: LabWorkflowScope; ownerUserId?: string };
      const ownerUserId =
        query.ownerUserId != null ? Number.parseInt(String(query.ownerUserId), 10) : undefined;
      const workflows = labWorkflowsService.listForCaller(caller, {
        scope: query.scope,
        ownerUserId: Number.isFinite(ownerUserId) ? ownerUserId : undefined,
      });
      return reply.send({ success: true, data: { workflows } });
    },
  );

  server.post(
    '/api/platform/lab-workflows',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const workflow = labWorkflowsService.createForCaller(caller, request.body);
        return reply.send({ success: true, data: { workflow } });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.put(
    '/api/platform/lab-workflows/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const workflow = labWorkflowsService.updateForCaller(
          caller,
          (request.params as { id: string }).id,
          request.body,
        );
        return reply.send({ success: true, data: { workflow } });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.delete(
    '/api/platform/lab-workflows/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        labWorkflowsService.deleteForCaller(caller, (request.params as { id: string }).id);
        return reply.send({ success: true });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  /**
   * Run one workflow now (W5.1/W5.2).
   *
   * `dryRun` defaults to **true**: the dangerous version must be the one you ask for explicitly, not
   * the one you get by forgetting a flag. The designer's Test button posts this default; its Run
   * button sends `dryRun: false`.
   */
  server.post(
    '/api/platform/lab-workflows/:id/run',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const body = (request.body ?? {}) as {
        dryRun?: unknown;
        envelope?: unknown;
        mockSampleId?: unknown;
        prepareApps?: unknown;
      };
      let envelope;
      if (body.envelope != null) {
        const parsed = LabDomainEventPublishSchema.safeParse(body.envelope);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false,
            error: 'INVALID_INPUT',
            message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
          });
        }
        envelope = parsed.data;
      }
      try {
        const result = await labWorkflowsService.runForCaller(
          caller,
          (request.params as { id: string }).id,
          {
            dryRun: body.dryRun !== false,
            envelope,
            mockSampleId: typeof body.mockSampleId === 'string' ? body.mockSampleId : null,
            prepareApps: body.prepareApps === true,
            io: server.io,
          },
        );
        return reply.send({ success: true, data: result });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-workflows/:id/required-apps',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      try {
        const summary = await labWorkflowsService.getRequiredAppsForCaller(
          caller,
          (request.params as { id: string }).id,
        );
        return reply.send({ success: true, data: summary });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-workflows/:id/prepare-apps',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      try {
        const result = await labWorkflowsService.prepareRequiredAppsForCaller(
          caller,
          (request.params as { id: string }).id,
        );
        return reply.send({ success: true, data: result });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  /**
   * Arm this workflow for the next real trigger (W5c).
   *
   * Deliberately **not** an "enable" operation: arming is per-user, in memory, and expires, so it
   * cannot leave the workflow reacting in production after the author has gone.
   *
   * `dryRun` defaults to true. A capture is normally a wiring check, and notifying a real person
   * during one is a surprise — surprises in automation are how trust is lost.
   */
  server.post(
    '/api/platform/lab-workflows/:id/listen',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const workflowId = (request.params as { id: string }).id;
      const workflow = labWorkflowsService.getForCaller(caller, workflowId);
      if (!workflow) {
        return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
      }

      const triggerEventType = getWorkflowTriggerEventType(workflow.definition);
      if (!triggerEventType) {
        return reply.status(400).send({
          success: false,
          error: 'INVALID_INPUT',
          message: 'This workflow has no trigger node to listen on.',
        });
      }

      const body = (request.body ?? {}) as { dryRun?: unknown };
      const armed = armListen({
        workflowId,
        userId: caller.userId,
        userRole: caller.role,
        triggerEventType,
        dryRun: body.dryRun !== false,
      });
      return reply.send({
        success: true,
        data: {
          listen: armed,
          ttlMs: LAB_WORKFLOW_LISTEN_TTL_MS,
          // Surfaced so the banner can say it permanently, not just per-capture. A webhook trigger
          // fires from the delivery route rather than the bus, and that route now satisfies arms
          // itself (`captureWebhookDelivery`), so a webhook can be listened on like any other.
          webhookListeningSupported: true,
        },
      });
    },
  );

  server.get(
    '/api/platform/lab-workflows/:id/listen',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const listen = getListen(caller.userId, (request.params as { id: string }).id);
      return reply.send({ success: true, data: { listen } });
    },
  );

  server.delete(
    '/api/platform/lab-workflows/:id/listen',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const disarmed = disarmListen(caller.userId, (request.params as { id: string }).id);
      return reply.send({ success: true, data: { disarmed } });
    },
  );

  /**
   * Effective schedules for one workflow (34.6).
   *
   * **Read-only by design.** There is deliberately no `POST`/`PUT`/`DELETE …/schedules` route:
   * schedules are authored by editing the graph and saving, so the graph remains the single source of
   * truth and there is one validation path. A second write route would let a row exist that the
   * designer cannot show, and two validation paths that disagree are how a broken schedule gets
   * stored.
   *
   * Reconciles first, so a graph that reached the database by another path (import, seed) gets its
   * rows before the caller reads them — a schedule visible only in the graph is a row the tick cannot
   * see.
   */
  server.get(
    '/api/platform/lab-workflows/:id/schedules',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.labUser) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const schedules = labWorkflowsService.listSchedulesForCaller(
          request.labUser,
          (request.params as { id: string }).id,
        );
        return reply.send({ success: true, data: { schedules } });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  /**
   * Execution history for the Logs tab.
   *
   * `kind=manual` is the designer's **Test** list, `kind=live` is **Live** (event / schedule /
   * webhook). Filtering happens here rather than in the panel so each list is a real query against the
   * shared 200-row retention window instead of a client-side slice of it.
   */
  server.get(
    '/api/platform/lab-workflows/:id/runs',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.labUser) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const query = request.query as { kind?: string; limit?: string };
      const kind = query.kind === 'manual' || query.kind === 'live' ? query.kind : undefined;
      const parsedLimit = query.limit != null ? Number.parseInt(query.limit, 10) : undefined;
      try {
        const runs = labWorkflowsService.listRunsForCaller(
          request.labUser,
          (request.params as { id: string }).id,
          { kind, limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined },
        );
        return reply.send({ success: true, data: { runs } });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  /**
   * Delete one or more run-history rows.
   *
   * `POST …/runs/delete` with a body rather than `DELETE …/runs/:id` repeated: the UI deletes a
   * **selection**, and N round-trips for one button press would leave a half-deleted selection if
   * one failed. Step rows go with each run through `ON DELETE CASCADE`.
   */
  server.post(
    '/api/platform/lab-workflows/:id/runs/delete',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.labUser) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const body = request.body as { runIds?: unknown } | undefined;
      const runIds = Array.isArray(body?.runIds)
        ? body.runIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [];
      if (runIds.length === 0) {
        return reply.status(400).send({ success: false, error: 'runIds must be a non-empty array' });
      }
      try {
        const deleted = labWorkflowsService.deleteRunsForCaller(
          request.labUser,
          (request.params as { id: string }).id,
          runIds,
        );
        return reply.send({ success: true, data: { deleted } });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  /** One run plus its step rows — the Logs details modal. */
  server.get(
    '/api/platform/lab-workflows/:id/runs/:runId',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.labUser) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const params = request.params as { id: string; runId: string };
      try {
        const detail = labWorkflowsService.getRunForCaller(
          request.labUser,
          params.id,
          params.runId,
        );
        return reply.send({ success: true, data: detail });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-workflows/:id/mocks',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.labUser) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const mocks = labWorkflowsService.listMockSamplesForCaller(
          request.labUser,
          (request.params as { id: string }).id,
        );
        return reply.send({ success: true, data: { mocks } });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-workflows/:id/mocks',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.labUser) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (request.labUser.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      try {
        const mock = labWorkflowsService.createMockSampleForCaller(
          request.labUser,
          (request.params as { id: string }).id,
          request.body,
        );
        return reply.send({ success: true, data: { mock } });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.delete(
    '/api/platform/lab-workflows/:id/mocks/:mockId',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.labUser) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const params = request.params as { id: string; mockId: string };
        labWorkflowsService.deleteMockSampleForCaller(request.labUser, params.id, params.mockId);
        return reply.send({ success: true });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-workflows/dry-run',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const body = request.body as { envelope?: unknown; workflowId?: string };
      const envelope = LabDomainEventPublishSchema.parse(body.envelope);
      try {
        const result = await labWorkflowsService.dryRunForCaller(caller, envelope, body.workflowId);
        return reply.send({ success: true, data: result });
      } catch (err) {
        return mapWorkflowsError(reply, err);
      }
    },
  );
}
