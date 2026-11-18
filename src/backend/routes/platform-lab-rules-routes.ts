import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { LabRulesError, labRulesService } from '../db/LabRules/lab-rules-service';
import { LabDomainEventPublishSchema } from '@/shared/types/schemas/lab-domain-event-schema';
import type { LabRuleScope } from '@/shared/types/lab-rule';

declare module 'fastify' {
  interface FastifyRequest {
    labUser?: User;
  }
}

function mapRulesError(reply: FastifyReply, err: unknown) {
  if (err instanceof LabRulesError) {
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

export function registerPlatformLabRulesRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/lab-rules',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const query = request.query as { scope?: LabRuleScope; ownerUserId?: string };
      const ownerUserId =
        query.ownerUserId != null ? Number.parseInt(String(query.ownerUserId), 10) : undefined;
      const rules = labRulesService.listForCaller(caller, {
        scope: query.scope,
        ownerUserId: Number.isFinite(ownerUserId) ? ownerUserId : undefined,
      });
      return reply.send({ success: true, data: { rules } });
    },
  );

  server.post(
    '/api/platform/lab-rules',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const rule = labRulesService.createForCaller(caller, request.body);
        return reply.send({ success: true, data: { rule } });
      } catch (err) {
        return mapRulesError(reply, err);
      }
    },
  );

  server.put(
    '/api/platform/lab-rules/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const rule = labRulesService.updateForCaller(
          caller,
          (request.params as { id: string }).id,
          request.body,
        );
        return reply.send({ success: true, data: { rule } });
      } catch (err) {
        return mapRulesError(reply, err);
      }
    },
  );

  server.delete(
    '/api/platform/lab-rules/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        labRulesService.deleteForCaller(caller, (request.params as { id: string }).id);
        return reply.send({ success: true });
      } catch (err) {
        return mapRulesError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-rules/dry-run',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      if (caller.role === 'viewer') {
        return reply.status(403).send({ success: false, error: 'FORBIDDEN' });
      }
      const body = request.body as { envelope?: unknown; ruleId?: string };
      const envelope = LabDomainEventPublishSchema.parse(body.envelope);
      try {
        const result = await labRulesService.dryRunForCaller(caller, envelope, body.ruleId);
        return reply.send({ success: true, data: result });
      } catch (err) {
        return mapRulesError(reply, err);
      }
    },
  );
}
