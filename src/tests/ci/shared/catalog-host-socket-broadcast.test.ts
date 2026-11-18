import { describe, expect, test, jest } from '@jest/globals';
import fastify from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { registerCatalogHostMutationBroadcast } from '@/shared/server/catalog-host-socket-broadcast';
import { CATALOG_HOST_SOCKET_EVENTS } from '@/shared/types/catalog-host-socket-events';

describe('registerCatalogHostMutationBroadcast', () => {
  test('emits catalog-host:data-changed after successful POST under /api/', async () => {
    const server = fastify();
    const httpServer = server.server;
    const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
    server.decorate('io', io);

    const emitSpy = jest.spyOn(io, 'emit');
    registerCatalogHostMutationBroadcast(server, 'app-time-tracking');

    server.post('/api/time/weeks/:weekKey/submit', async () => ({ success: true, submitted: 1 }));
    server.get('/health', async () => ({ ok: true }));

    await server.ready();
    await server.inject({
      method: 'POST',
      url: '/api/time/weeks/2026-W01/submit',
    });

    expect(emitSpy).toHaveBeenCalledWith(
      CATALOG_HOST_SOCKET_EVENTS.DATA_CHANGED,
      expect.objectContaining({
        hostAppId: 'app-time-tracking',
        source: 'rest',
        path: '/api/time/weeks/2026-W01/submit',
      }),
    );

    await server.close();
    io.close();
  });

  test('does not emit on failed mutations', async () => {
    const server = fastify();
    const io = new SocketIOServer(server.server, { cors: { origin: '*' } });
    server.decorate('io', io);
    const emitSpy = jest.spyOn(io, 'emit');
    registerCatalogHostMutationBroadcast(server, 'app-suggestion-box');

    server.post('/api/suggestions', async (_req, reply) =>
      reply.status(400).send({ error: 'bad' }),
    );
    await server.ready();
    await server.inject({ method: 'POST', url: '/api/suggestions', payload: {} });

    expect(emitSpy).not.toHaveBeenCalled();
    await server.close();
    io.close();
  });
});
