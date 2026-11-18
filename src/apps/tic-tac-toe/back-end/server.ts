import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerGameAdapter } from '@/shared/game-platform/adapter-registry';
import { registerGameHttpRoutes } from '@/shared/game-platform/http-routes';
import { registerGameSocket } from '@/shared/game-platform/socket-registrar';
import { GameRunsService } from '@/shared/game-platform/runs-service';
import { TurnBasedMatchService } from '@/shared/game-platform/match-service';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapTicTacToeTables } from './db/bootstrap';
import { ticTacToeAdapter } from './adapter';
import { TIC_TAC_TOE_CONFIG } from '../shared/game-config';
import { registerLabGameHintOnAppServer } from '@/shared/server/register-lab-game-hint-on-app-server';

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();

  const db = dbProxy.getDb();
  bootstrapTicTacToeTables(db);

  // The shared kit resolves the rules adapter by game id from this registry.
  registerGameAdapter(ticTacToeAdapter);

  const runsService = new GameRunsService(db, TIC_TAC_TOE_CONFIG);
  const matchService = new TurnBasedMatchService(db, TIC_TAC_TOE_CONFIG, runsService);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerGameSocket(io, { config: TIC_TAC_TOE_CONFIG, runsService, matchService });
    },
    registerRoutes: async (server) => {
      registerGameHttpRoutes(server, { config: TIC_TAC_TOE_CONFIG, runsService, matchService });
      registerPlatformApiProxyRoutes(server);
      registerLabGameHintOnAppServer(server, TIC_TAC_TOE_CONFIG.appId);
    },
  });

  await listen();
};

export const startServer = start;
