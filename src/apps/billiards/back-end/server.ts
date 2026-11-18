import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerLabGameHintRoutes } from '@/shared/server/register-lab-game-hint-routes';
import { registerGameAdapters } from '@/shared/game-platform/adapter-registry';
import { registerGameHttpRoutes } from '@/shared/game-platform/http-routes';
import { registerGameSocket } from '@/shared/game-platform/socket-registrar';
import { GameRunsService } from '@/shared/game-platform/runs-service';
import { TurnBasedMatchService } from '@/shared/game-platform/match-service';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapBilliardsTables } from './db/bootstrap';
import { billiardsEightBallAdapter, billiardsPracticeAdapter } from './adapter';
import { BILLIARDS_CONFIG } from '../shared/game-config';
import { ensureBilliardsRapier } from '../shared/billiards-rapier-init';

const start = async (): Promise<void> => {
  await ensureBilliardsRapier();
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();

  const db = dbProxy.getDb();
  bootstrapBilliardsTables(db);

  registerGameAdapters([billiardsPracticeAdapter, billiardsEightBallAdapter]);

  const runsService = new GameRunsService(db, BILLIARDS_CONFIG);
  const matchService = new TurnBasedMatchService(db, BILLIARDS_CONFIG, runsService);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerGameSocket(io, { config: BILLIARDS_CONFIG, runsService, matchService });
    },
    registerRoutes: async (server) => {
      registerGameHttpRoutes(server, { config: BILLIARDS_CONFIG, runsService, matchService });
      registerPlatformApiProxyRoutes(server);
      registerLabGameHintRoutes(server, 'app-billiards');
    },
  });

  await listen();
};

export const startServer = start;
