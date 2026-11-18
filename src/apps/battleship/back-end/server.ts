import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerGameAdapter } from '@/shared/game-platform/adapter-registry';
import { registerGameHttpRoutes } from '@/shared/game-platform/http-routes';
import { registerGameSocket } from '@/shared/game-platform/socket-registrar';
import { GameRunsService } from '@/shared/game-platform/runs-service';
import { TurnBasedMatchService } from '@/shared/game-platform/match-service';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapBattleshipTables } from './db/bootstrap';
import { battleshipAdapter } from './adapter';
import { BATTLESHIP_CONFIG } from '../shared/game-config';
import { registerLabGameHintOnAppServer } from '@/shared/server/register-lab-game-hint-on-app-server';

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();

  const db = dbProxy.getDb();
  bootstrapBattleshipTables(db);

  registerGameAdapter(battleshipAdapter);

  const runsService = new GameRunsService(db, BATTLESHIP_CONFIG);
  const matchService = new TurnBasedMatchService(db, BATTLESHIP_CONFIG, runsService);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerGameSocket(io, { config: BATTLESHIP_CONFIG, runsService, matchService });
    },
    registerRoutes: async (server) => {
      registerGameHttpRoutes(server, { config: BATTLESHIP_CONFIG, runsService, matchService });
      registerPlatformApiProxyRoutes(server);
      registerLabGameHintOnAppServer(server, BATTLESHIP_CONFIG.appId);
    },
  });

  await listen();
};

export const startServer = start;
