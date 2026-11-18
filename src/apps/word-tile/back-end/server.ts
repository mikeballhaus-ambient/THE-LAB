import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerGameAdapter } from '@/shared/game-platform/adapter-registry';
import { registerGameHttpRoutes } from '@/shared/game-platform/http-routes';
import { registerGameSocket } from '@/shared/game-platform/socket-registrar';
import { GameRunsService } from '@/shared/game-platform/runs-service';
import { TurnBasedMatchService } from '@/shared/game-platform/match-service';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { runWordTileDbBootstrap } from './db/bootstrap';
import { tileWordGridAdapter } from './adapter';
import { WORD_TILE_CONFIG } from '../shared/game-config';
import { registerLabGameHintOnAppServer } from '@/shared/server/register-lab-game-hint-on-app-server';
import { registerWordTileBestPlayHintRoute } from './register-word-tile-best-play-hint-route';

const start = async () => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  await runWordTileDbBootstrap(dbProxy);

  const db = dbProxy.getDb();

  // The shared kit resolves the rules adapter by game id from this registry.
  registerGameAdapter(tileWordGridAdapter);

  const runsService = new GameRunsService(db, WORD_TILE_CONFIG);
  const matchService = new TurnBasedMatchService(db, WORD_TILE_CONFIG, runsService);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerGameSocket(io, { config: WORD_TILE_CONFIG, runsService, matchService });
    },
    registerRoutes: async (server) => {
      registerGameHttpRoutes(server, { config: WORD_TILE_CONFIG, runsService, matchService });
      registerPlatformApiProxyRoutes(server);
      registerLabGameHintOnAppServer(server, WORD_TILE_CONFIG.appId);
      registerWordTileBestPlayHintRoute(server);
    },
  });

  await listen();
};

export const startServer = start;
