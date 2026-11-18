import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { LabLedgerError, isPlatformLedgerAdmin, labLedgerService } from '../db/LabLedger/lab-ledger-service';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }

  interface FastifyRequest {
    labUser?: User;
  }
}

function mapError(reply: FastifyReply, err: unknown) {
  if (err instanceof LabLedgerError) {
    const status =
      err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400;
    return reply.status(status).send({ success: false, error: err.code, message: err.message });
  }
  throw err;
}

export function registerPlatformLabLedgerRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/lab-ledger/capabilities',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      return reply.send({
        success: true,
        data: {
          canManageAccounts: isPlatformLedgerAdmin(caller),
          canPostEntries: caller.role !== 'viewer',
        },
      });
    },
  );

  server.get(
    '/api/platform/lab-ledger/accounts',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const accounts = labLedgerService.listAccountsForCaller(caller);
      return reply.send({
        success: true,
        data: {
          accounts,
          canManageAccounts: isPlatformLedgerAdmin(caller),
          platformRole: caller.role,
        },
      });
    },
  );

  server.post(
    '/api/platform/lab-ledger/accounts',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const account = labLedgerService.createAccountForCaller(caller, request.body);
        return reply.send({ success: true, data: { account } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.put(
    '/api/platform/lab-ledger/accounts/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const account = labLedgerService.updateAccountForCaller(
          caller,
          (request.params as { id: string }).id,
          request.body,
        );
        return reply.send({ success: true, data: { account } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.delete(
    '/api/platform/lab-ledger/accounts/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        labLedgerService.deleteAccountForCaller(caller, (request.params as { id: string }).id);
        return reply.send({ success: true });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-ledger/entries',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const entries = labLedgerService.listRecentEntriesForCaller(caller);
      return reply.send({ success: true, data: { entries } });
    },
  );

  server.post(
    '/api/platform/lab-ledger/entries',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const entry = await labLedgerService.postEntryForCaller(caller, request.body, server.io);
        return reply.send({ success: true, data: { entry } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );
}
