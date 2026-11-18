import { createAppServer } from '@/shared/services/create-app-server';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { runHelpDeskDbBootstrap } from './db/bootstrap';
import { registerAppScopedRoutes } from './routes/app-scoped-routes';
import discoveryRoutes from './routes/connector/discovery';
import connectorTicketsRoutes from './routes/connector/tickets';
import connectorKanbanBoardsRoutes from './routes/connector/kanban-boards';
import ticketLookupsRoutes from './routes/connector/lookups';
import kanbanBoardRoutes from './routes/kanban-boards';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerAppSeedDataRoutes } from '@/shared/server/register-app-seed-data-routes';
import { helpDeskSeedHandlers } from './seed-data/help-desk-seed-handlers';
import { seedDemoTicketsIfMissing } from './db/seed-demo-tickets';

const _port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3012;

export async function startServer(): Promise<void> {
  const db = AppDatabaseServiceProxy.getInstance();
  await db.initialize();
  await runHelpDeskDbBootstrap(db);
  seedDemoTicketsIfMissing(db.getDb());

  const { listen } = await createAppServer({
    registerRoutes: async (server) => {
      registerAppScopedRoutes(server);
      registerPlatformApiProxyRoutes(server);
      await server.register(discoveryRoutes, { prefix: '/api/connector/discovery' });
      await server.register(ticketLookupsRoutes, { prefix: '/api/connector/tickets' });
      await server.register(connectorTicketsRoutes, { prefix: '/api/connector/tickets' });
      await server.register(connectorKanbanBoardsRoutes, { prefix: '/api/connector/kanban-boards' });
      await server.register(kanbanBoardRoutes, { prefix: '/api/kanban-boards' });
      registerAppSeedDataRoutes(server, helpDeskSeedHandlers);
    },
  });

  await listen(_port);
}
