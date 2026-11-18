import { createAppServer } from '@/shared/services/create-app-server';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { runTaskListDbBootstrap } from './db/bootstrap';
import { registerAppScopedRoutes } from './routes/app-scoped-routes';
import { SOCKET_EVENTS } from '../shared/types';
import { registerTaskRoutes, registerTaskListRoutes } from './utils/appRoutes';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import discoveryRoutes from './routes/connector/discovery';
import taskLookupsRoutes from './routes/connector/lookups';
import connectorTasksRoutes from './routes/connector/tasks';
import connectorTaskListsRoutes from './routes/connector/task-lists';
import { registerAppSeedDataRoutes } from '@/shared/server/register-app-seed-data-routes';
import { taskListSeedHandlers } from './seed-data/task-list-seed-handlers';
import { seedDemoTasksIfMissing } from './db/seed-demo-tasks';

const mockData = {
  message: 'Hello from Example Server App!',
};

const _port = process.env?.PORT ? parseInt(process.env.PORT, 10) : 3005;

const start = async () => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  await runTaskListDbBootstrap(dbProxy);
  seedDemoTasksIfMissing(dbProxy.getDb());

  const { listen } = await createAppServer({
    additionalPublicPathPrefixes: ['/api/discovery'],
    attachSocketIO: true,
    onSocketConnection: (io) => {
      io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_REQUEST, async () => {
          socket.emit(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_RESPONSE, {
            data: 'I am glad your are conntect, hello from the server!',
          });
        });

        socket.on('disconnect', () => {
          console.log(`Client disconnected: ${socket.id}`);
        });
      });
    },
    registerRoutes: async (server) => {
      server.get('/data', async () => mockData);
      registerTaskRoutes(server);
      registerTaskListRoutes(server);
      registerAppScopedRoutes(server);
      registerPlatformApiProxyRoutes(server);
      await server.register(discoveryRoutes, { prefix: '/api/discovery' });
      await server.register(taskLookupsRoutes, { prefix: '/api/connector/tasks' });
      await server.register(connectorTasksRoutes, { prefix: '/api/connector/tasks' });
      await server.register(connectorTaskListsRoutes, { prefix: '/api/connector/task-lists' });
      registerAppSeedDataRoutes(server, taskListSeedHandlers);
    },
  });

  await listen(_port);
};

export const startServer = start;
