import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import {
  CATALOG_HOST_SOCKET_EVENTS,
  type CatalogHostDataChangedPayload,
  type CatalogHostDataChangeSource,
} from '@/shared/types/catalog-host-socket-events';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function pathWithoutQuery(url: string): string {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

function connectorSegmentFromPath(path: string): string | undefined {
  const match = path.match(/^\/api\/connector\/([^/]+)/);
  return match?.[1];
}

export function emitCatalogHostDataChanged(
  server: FastifyInstance,
  partial: Omit<CatalogHostDataChangedPayload, 'at'>,
): void {
  if (!server.io) {
    return;
  }
  const payload: CatalogHostDataChangedPayload = {
    ...partial,
    at: new Date().toISOString(),
  };
  server.io.emit(CATALOG_HOST_SOCKET_EVENTS.DATA_CHANGED, payload);
}

/**
 * After successful REST or connector writes under `/api/`, broadcast `catalog-host:data-changed`.
 * Register once per catalog host server (via `createAppServer({ catalogHostAppId })`).
 */
export function registerCatalogHostMutationBroadcast(
  server: FastifyInstance,
  hostAppId: string,
): void {
  server.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    if (reply.statusCode >= 400) {
      done();
      return;
    }
    if (!MUTATING_METHODS.has(request.method)) {
      done();
      return;
    }
    const path = pathWithoutQuery(request.url);
    if (!path.startsWith('/api/')) {
      done();
      return;
    }
    const source: CatalogHostDataChangeSource = path.startsWith('/api/connector/')
      ? 'connector'
      : 'rest';
    emitCatalogHostDataChanged(server, {
      hostAppId,
      source,
      path,
      connectorSegment: source === 'connector' ? connectorSegmentFromPath(path) : undefined,
    });
    done();
  });
}
