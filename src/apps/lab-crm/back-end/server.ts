import { createAppServer } from '@/shared/services/create-app-server';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { SOCKET_EVENTS } from '../shared/types';
import discoveryRoutes from './routes/connector/discovery';
import entityConnectorRoutes from './routes/connector/entity-connector';
import entityApiRoutes from './routes/entities';
import formBindingRoutes from './routes/form-bindings';
import leadRoutes from './routes/leads';
import {
  seedFormBindingsFromRegistry,
  seedTaskFormBindingsFromRegistry,
  seedTicketFormBindingsFromRegistry,
} from './db/seed-form-bindings';
import integrationRoutes from './routes/integrations';
import { FormBindingService } from './services/form-binding-service';
import { registerCrmSocket, emitEntityRecordsChanged } from './utils/crm-socket-broadcast';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerAppSeedDataRoutes } from '@/shared/server/register-app-seed-data-routes';
import { crmSeedHandlers } from './seed-data/crm-seed-handlers';
import { syncCrmIntegrationsOnStartup } from './services/crm-platform-integration-sync';
import { resolvePlatformActorUserId } from '@/shared/services/platform-user-client.node';
import { refreshCrmDemoOnAppBoot } from './db/seed-crm-demo-boot';
import { DEFAULT_ENTITY_SEEDS } from './db/seed-default-entities';

const _port = process.env?.PORT ? parseInt(process.env.PORT, 10) : 3010;

const start = async () => {
  await AppDatabaseServiceProxy.getInstance().initialize();
  const db = AppDatabaseServiceProxy.getInstance().getDb();
  const demoBoot = refreshCrmDemoOnAppBoot(db);
  await seedFormBindingsFromRegistry();
  await seedTaskFormBindingsFromRegistry();
  await seedTicketFormBindingsFromRegistry();
  await FormBindingService.getInstance().dedupeStoredBindings();

  try {
    const actorUserId = resolvePlatformActorUserId();
    await syncCrmIntegrationsOnStartup(actorUserId);
  } catch (err) {
    console.warn(
      'CRM integration manifest sync skipped:',
      err instanceof Error ? err.message : err,
    );
  }

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerCrmSocket(io);
      if (demoBoot.reseeded) {
        for (const seed of DEFAULT_ENTITY_SEEDS) {
          emitEntityRecordsChanged(seed.entityKey);
        }
      }
      io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_REQUEST, async () => {
          socket.emit(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_RESPONSE, {
            data: 'Hello from CRM server',
          });
        });

        socket.on('disconnect', () => {
          console.log(`Client disconnected: ${socket.id}`);
        });
      });
    },
    registerRoutes: async (server) => {
      registerPlatformApiProxyRoutes(server);
      await server.register(discoveryRoutes, { prefix: '/api/connector/discovery' });
      await server.register(entityConnectorRoutes, { prefix: '/api/connector' });
      await server.register(entityApiRoutes, { prefix: '/api/entities' });
      await server.register(formBindingRoutes, { prefix: '/api' });
      await server.register(integrationRoutes, { prefix: '/api' });
      await server.register(leadRoutes, { prefix: '/api' });
      registerAppSeedDataRoutes(server, crmSeedHandlers);
    },
  });

  await listen(_port);
};

export const startServer = start;
