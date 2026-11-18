import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { registerGameAdapter } from '@/shared/game-platform/adapter-registry';
import { registerGameHttpRoutes } from '@/shared/game-platform/http-routes';
import { registerGameSocket } from '@/shared/game-platform/socket-registrar';
import { GameRunsService } from '@/shared/game-platform/runs-service';
import { TurnBasedMatchService } from '@/shared/game-platform/match-service';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapHangmanTables } from './db/bootstrap';
import { hangmanAdapter } from './adapter';
import { HANGMAN_CONFIG } from '../shared/game-config';
import { registerLabGameHintOnAppServer } from '@/shared/server/register-lab-game-hint-on-app-server';
import { registerHangmanSafeLetterHintRoute } from './register-hangman-safe-letter-hint-route';

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();

  const db = dbProxy.getDb();
  bootstrapHangmanTables(db);

  registerGameAdapter(hangmanAdapter);

  const runsService = new GameRunsService(db, HANGMAN_CONFIG);
  const matchService = new TurnBasedMatchService(db, HANGMAN_CONFIG, runsService);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerGameSocket(io, { config: HANGMAN_CONFIG, runsService, matchService });
    },
    registerRoutes: async (server) => {
      registerGameHttpRoutes(server, { config: HANGMAN_CONFIG, runsService, matchService });
      registerPlatformApiProxyRoutes(server);
      registerLabGameHintOnAppServer(server, HANGMAN_CONFIG.appId);
      registerHangmanSafeLetterHintRoute(server, matchService);
    },
  });

  await listen();
};

export const startServer = start;
