import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { LabApprovalsError, labApprovalsService } from '../db/LabApprovals/lab-approvals-service';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }

  interface FastifyRequest {
    labUser?: User;
  }
}

function mapError(reply: FastifyReply, err: unknown) {
  if (err instanceof LabApprovalsError) {
    const status =
      err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400;
    return reply.status(status).send({ success: false, error: err.code, message: err.message });
  }
  throw err;
}

export function registerPlatformLabApprovalsRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/lab-approvals/policies',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const policies = labApprovalsService.listPoliciesForCaller(caller);
      return reply.send({ success: true, data: { policies } });
    },
  );

  server.post(
    '/api/platform/lab-approvals/policies',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const policy = labApprovalsService.createPolicyForCaller(caller, request.body);
        return reply.send({ success: true, data: { policy } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.put(
    '/api/platform/lab-approvals/policies/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const policy = labApprovalsService.updatePolicyForCaller(
          caller,
          (request.params as { id: string }).id,
          request.body,
        );
        return reply.send({ success: true, data: { policy } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.delete(
    '/api/platform/lab-approvals/policies/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        labApprovalsService.deletePolicyForCaller(caller, (request.params as { id: string }).id);
        return reply.send({ success: true });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-approvals/inbox',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const requests = labApprovalsService.listInboxForCaller(caller);
      return reply.send({ success: true, data: { requests } });
    },
  );

  server.get(
    '/api/platform/lab-approvals/requests/mine',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const requests = labApprovalsService.listMyRequestsForCaller(caller);
      return reply.send({ success: true, data: { requests } });
    },
  );

  server.get(
    '/api/platform/lab-approvals/requests/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const requestRecord = labApprovalsService.getRequestForCaller(
          caller,
          (request.params as { id: string }).id,
        );
        if (!requestRecord) {
          return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
        }
        return reply.send({ success: true, data: { request: requestRecord } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-approvals/requests',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const requestRecord = await labApprovalsService.createRequestForCaller(
          caller,
          request.body,
          server.io,
        );
        return reply.send({ success: true, data: { request: requestRecord } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-approvals/requests/:id/decide',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const requestRecord = await labApprovalsService.decideForCaller(
          caller,
          (request.params as { id: string }).id,
          request.body,
          server.io,
        );
        return reply.send({ success: true, data: { request: requestRecord } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );
}
