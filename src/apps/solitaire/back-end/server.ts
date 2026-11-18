import { z } from 'zod';
import { createAppServer } from '@/shared/services/create-app-server';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { runSolitaireDbBootstrap } from './db/bootstrap';
import { RunsService } from './services/runs-service';
import { registerSolitaireSocket } from './socket/register-solitaire-socket';
import type { GameRunPayload } from '../shared/types';
import { SOLITAIRE_APP_ID } from '../shared/types';
import { registerLabGameHintOnAppServer } from '@/shared/server/register-lab-game-hint-on-app-server';

const SubmitRunSchema = z.object({
  gameId: z.string(),
  outcome: z.enum(['win', 'loss', 'draw']),
  primaryValue: z.number(),
  secondaryValue: z.number().optional(),
  durationMs: z.number().int().nonnegative(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  runId: z.string().uuid(),
});

/**
 * Solitaire app server entry (spawned by AppManager as
 * `/src/apps/solitaire/back-end/entry.ts` on a 4000–4999 port).
 *
 * HTTP routes are kept as a parity surface for tests/tools; the app UI uses
 * Socket.IO (`SOLITAIRE_SOCKET_EVENTS`) on the same instance.
 */
const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  await runSolitaireDbBootstrap(dbProxy);

  const runsService = new RunsService(dbProxy.getDb());

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      registerSolitaireSocket(io, runsService);
    },
    registerRoutes: (server) => {
      registerLabGameHintOnAppServer(server, SOLITAIRE_APP_ID);
      server.get('/api/games', async (request) => {
        const userId = resolveLabAppActorUserId(request);
        return { games: runsService.listCatalogForUser(userId) };
      });

      server.post('/api/games/:gameId/runs', async (request, reply) => {
        const userId = resolveLabAppActorUserId(request);
        const parsed = SubmitRunSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: parsed.error.message });
        }
        try {
          return runsService.submitRun(userId, parsed.data as GameRunPayload);
        } catch (err) {
          return reply.status(400).send({
            error: err instanceof Error ? err.message : 'Submit failed',
          });
        }
      });
    },
  });

  await listen();
};

export const startServer = start;
