import type { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import {
  resolveLabAppUserIdFromSocket,
  type LabAppSocket,
} from '@/shared/server/lab-app-socket-auth';
import {
  SOLITAIRE_SOCKET_EVENTS,
  type GameRunPayload,
  type SolitaireSocketAck,
} from '../../shared/types';
import type { RunsService } from '../services/runs-service';

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

function ackError(message: string): SolitaireSocketAck<never> {
  return { success: false, error: message };
}

/** Solitaire Socket.IO surface — solo run submit + catalog. Bound to the app port. */
export function registerSolitaireSocket(io: SocketIOServer, runsService: RunsService): void {
  io.use((socket, next) => {
    const userId = resolveLabAppUserIdFromSocket(socket);
    if (!userId) {
      next(new Error('Authentication required'));
      return;
    }
    (socket as LabAppSocket).labUserId = userId;
    next();
  });

  io.on('connection', (socket: LabAppSocket) => {
    const userId = socket.labUserId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.on(
      SOLITAIRE_SOCKET_EVENTS.GAMES_LIST,
      (_payload: unknown, ack?: (res: SolitaireSocketAck<{ games: unknown }>) => void) => {
        ack?.({ success: true, data: { games: runsService.listCatalogForUser(userId) } });
      },
    );

    socket.on(
      SOLITAIRE_SOCKET_EVENTS.RUN_SUBMIT,
      (payload: unknown, ack?: (res: SolitaireSocketAck<unknown>) => void) => {
        const parsed = SubmitRunSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          const result = runsService.submitRun(userId, parsed.data as GameRunPayload);
          ack?.({ success: true, data: result });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Submit failed'));
        }
      },
    );
  });
}
