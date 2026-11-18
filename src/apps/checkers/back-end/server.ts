import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerGameAdapter } from '@/shared/game-platform/adapter-registry';
import { registerGameHttpRoutes } from '@/shared/game-platform/http-routes';
import { registerGameSocket } from '@/shared/game-platform/socket-registrar';
import { GameRunsService } from '@/shared/game-platform/runs-service';
import { TurnBasedMatchService } from '@/shared/game-platform/match-service';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapCheckersTables } from './db/bootstrap';
import { checkersAdapter } from './adapter';
import { CHECKERS_CONFIG } from '../shared/game-config';
import { registerLabGameHintOnAppServer } from '@/shared/server/register-lab-game-hint-on-app-server';

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();

  const db = dbProxy.getDb();
  bootstrapCheckersTables(db);

  registerGameAdapter(checkersAdapter);

  const runsService = new GameRunsService(db, CHECKERS_CONFIG);
  const matchService = new TurnBasedMatchService(db, CHECKERS_CONFIG, runsService);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerGameSocket(io, { config: CHECKERS_CONFIG, runsService, matchService });
    },
    registerRoutes: async (server) => {
      registerGameHttpRoutes(server, { config: CHECKERS_CONFIG, runsService, matchService });
      registerPlatformApiProxyRoutes(server);
      registerLabGameHintOnAppServer(server, CHECKERS_CONFIG.appId);
    },
  });

  await listen();
};

export const startServer = start;
