import type { FastifyInstance } from 'fastify';
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { resolveLabCorsOptions, resolveSocketIoCorsOptions } from '@/backend/auth/lab-cors';
import { registerLabAppHttpAuth, DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES } from '@/shared/server/lab-app-http-auth';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';
import { registerCatalogHostMutationBroadcast } from '@/shared/server/catalog-host-socket-broadcast';

export interface CreateAppServerOptions {
  logger?: boolean;
  /** Register app routes after health + JWT hook. */
  registerRoutes?: (server: FastifyInstance) => Promise<void> | void;
  attachSocketIO?: boolean;
  onSocketConnection?: (io: SocketIOServer) => void;
  resolveServiceToken?: boolean;
  /** Merged into the default `/health` payload (e.g. ai-tunes MP3 stats). */
  healthExtras?: () => Record<string, unknown>;
  /** Extra paths that skip user JWT (in addition to defaults). */
  additionalPublicPathPrefixes?: readonly string[];
  /**
   * When set with `attachSocketIO: true`, successful `/api/` mutating responses emit
   * `catalog-host:data-changed` (see `useCatalogHostLiveRefresh` on the workspace UI).
   */
  catalogHostAppId?: string;
}

export interface AppServerHandle {
  server: FastifyInstance;
  listen: (port?: number, host?: string) => Promise<{ httpServer: HttpServer; io?: SocketIOServer }>;
  close: () => Promise<void>;
}

/**
 * Shared Fastify bootstrap for hybrid/server apps (rm-46 **3.1**):
 * CORS, `/health`, user JWT hook, SIGTERM/SIGINT graceful close.
 */
export async function createAppServer(options: CreateAppServerOptions = {}): Promise<AppServerHandle> {
  const server = fastify({ logger: options.logger ?? true });

  if (options.resolveServiceToken !== false) {
    resolveLabAppServiceToken();
  }

  await server.register(fastifyCors, resolveLabCorsOptions());
  registerLabAppHttpAuth(server, {
    publicPathPrefixes: [
      ...DEFAULT_LAB_APP_PUBLIC_PATH_PREFIXES,
      ...(options.additionalPublicPathPrefixes ?? []),
    ],
  });

  server.get('/health', async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ...(options.healthExtras?.() ?? {}),
  }));

  if (options.registerRoutes) {
    await options.registerRoutes(server);
  }

  if (options.catalogHostAppId?.trim()) {
    registerCatalogHostMutationBroadcast(server, options.catalogHostAppId.trim());
  }

  let io: SocketIOServer | undefined;
  let httpServer: HttpServer | undefined;

  const listen = async (
    port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005,
    host = '0.0.0.0',
  ): Promise<{ httpServer: HttpServer; io?: SocketIOServer }> => {
    httpServer = server.server;
    if (options.attachSocketIO) {
      io = new SocketIOServer(httpServer, { cors: resolveSocketIoCorsOptions() });
      server.decorate('io', io);
      if (options.onSocketConnection) {
        options.onSocketConnection(io);
      }
    }
    await server.ready();
    await httpServer.listen({ port, host });
    const baseUrl = process.env.BASEURL ?? 'http://localhost';
    console.log(`Server running on ${baseUrl}:${port}`);
    return { httpServer, io };
  };

  const close = async (): Promise<void> => {
    await server.close();
  };

  const closer = async (): Promise<void> => {
    console.log('Server App Shutting down...');
    try {
      await close();
      console.log('Server App Server closed');
      process.exit(0);
    } catch (err) {
      console.error('Server App Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void closer());
  process.on('SIGTERM', () => void closer());

  return { server, listen, close };
}
