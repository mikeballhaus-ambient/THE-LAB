/**
 * Generic Socket.IO registrar for a turn-based catalog game.
 *
 * Replaces Word Tile's app-local `register-word-tile-socket.ts`. Event names
 * come from {@link GamePlatformConfig.socketEvents}; all persistence goes through
 * the shared {@link TurnBasedMatchService} + {@link GameRunsService}.
 */
import type { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import {
  resolveLabAppUserIdFromSocket,
  type LabAppSocket,
} from '@/shared/server/lab-app-socket-auth';
import type { TurnBasedMatchService } from './match-service';
import type { GameRunsService } from './runs-service';
import type { GameDifficulty, GamePlatformConfig } from './types';

export interface GameSocketAck<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const CreateAiMatchSchema = z.object({
  gameId: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'boss']).default('medium'),
  rulesProfile: z.enum(['free', 'eight-ball', 'nine-ball']).optional(),
  wagerQuarks: z.number().int().min(0).optional(),
  practice: z.boolean().optional(),
});

const CreateSoloMatchSchema = z.object({
  gameId: z.string(),
  rulesProfile: z.enum(['free', 'eight-ball', 'nine-ball']).optional(),
  turnTimerMs: z.number().int().positive().optional(),
});

const MoveSchema = z.object({
  matchId: z.string().uuid(),
  move: z.record(z.string(), z.unknown()),
});

const MatchIdSchema = z.object({ matchId: z.string().uuid() });

const CreateInviteSchema = z.object({
  gameId: z.string(),
  inviteeId: z.number().int().positive(),
  turnTimerMs: z.number().int().positive().optional(),
  practice: z.boolean().optional(),
  rulesProfile: z.enum(['free', 'eight-ball', 'nine-ball']).optional(),
  wagerQuarks: z.number().int().min(0).optional(),
});

const InviteIdSchema = z.object({ inviteId: z.string().uuid() });

const SubmitRunSchema = z.object({
  gameId: z.string(),
  outcome: z.enum(['win', 'loss', 'draw']),
  primaryValue: z.number(),
  agentPrimaryValue: z.number().optional(),
  secondaryValue: z.number().optional(),
  durationMs: z.number().int().nonnegative(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'boss']).optional(),
  opponentKind: z.enum(['ai', 'human']).optional(),
  opponentUserId: z.number().int().positive().optional(),
  matchId: z.string().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  runId: z.string().uuid(),
});

function ackError(message: string): GameSocketAck<never> {
  return { success: false, error: message };
}

export interface RegisterGameSocketOptions {
  config: GamePlatformConfig;
  runsService: GameRunsService;
  matchService: TurnBasedMatchService;
}

export function registerGameSocket(
  io: SocketIOServer,
  { config, runsService, matchService }: RegisterGameSocketOptions,
): void {
  const ev = config.socketEvents;
  const userRoom = (userId: number) => `${config.appSlug}:user:${userId}`;

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
    socket.join(userRoom(userId));

    socket.on(
      ev.gamesList,
      (_payload: unknown, ack?: (res: GameSocketAck<{ games: unknown }>) => void) => {
        ack?.({ success: true, data: { games: runsService.listCatalogForUser(userId) } });
      },
    );

    socket.on(
      ev.runSubmit,
      (payload: unknown, ack?: (res: GameSocketAck<unknown>) => void) => {
        const parsed = SubmitRunSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          ack?.({ success: true, data: runsService.submitRun(userId, parsed.data) });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Submit failed'));
        }
      },
    );

    socket.on(
      ev.h2hGet,
      (payload: { gameId: string; opponentUserId: number }, ack?: (res: GameSocketAck<unknown>) => void) => {
        const oppId = Number(payload?.opponentUserId);
        if (!payload?.gameId || !Number.isFinite(oppId) || oppId <= 0) {
          ack?.(ackError('Invalid head-to-head request'));
          return;
        }
        try {
          ack?.({
            success: true,
            data: runsService.getHumanHeadToHeadStats(userId, oppId, payload.gameId),
          });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Failed to load stats'));
        }
      },
    );

    socket.on(
      ev.matchGet,
      async (payload: unknown, ack?: (res: GameSocketAck<{ match: unknown }>) => void) => {
        const parsed = MatchIdSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          const match = await matchService.getMatchForUser(parsed.data.matchId, userId);
          if (!match) {
            ack?.(ackError('Not found'));
            return;
          }
          ack?.({ success: true, data: { match } });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Load failed'));
        }
      },
    );

    socket.on(
      ev.matchCreateAi,
      async (payload: unknown, ack?: (res: GameSocketAck<{ match: unknown }>) => void) => {
        const parsed = CreateAiMatchSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          const match = await matchService.createAiMatch(userId, parsed.data.gameId, parsed.data.difficulty as GameDifficulty, {
            ...(parsed.data.rulesProfile != null ? { rulesProfile: parsed.data.rulesProfile } : {}),
            ...(parsed.data.wagerQuarks != null ? { wagerQuarks: parsed.data.wagerQuarks } : {}),
            ...(parsed.data.practice ? { practice: true } : {}),
          });
          ack?.({ success: true, data: { match } });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Create failed'));
        }
      },
    );

    if (ev.matchCreateSolo) {
      socket.on(
        ev.matchCreateSolo,
        async (payload: unknown, ack?: (res: GameSocketAck<{ match: unknown }>) => void) => {
          const parsed = CreateSoloMatchSchema.safeParse(payload);
          if (!parsed.success) {
            ack?.(ackError(parsed.error.message));
            return;
          }
          try {
            const match = await matchService.createSoloMatch(userId, parsed.data.gameId, {
              turnTimerMs: parsed.data.turnTimerMs,
              rulesProfile: parsed.data.rulesProfile,
            });
            ack?.({ success: true, data: { match } });
          } catch (e) {
            ack?.(ackError(e instanceof Error ? e.message : 'Create failed'));
          }
        },
      );
    }

    socket.on(
      ev.matchMove,
      async (payload: unknown, ack?: (res: GameSocketAck<{ match: unknown }>) => void) => {
        const parsed = MoveSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          const match = await matchService.submitMove(parsed.data.matchId, userId, parsed.data.move);
          if (!match) {
            ack?.(ackError('Not found'));
            return;
          }
          ack?.({ success: true, data: { match } });
          if (match.opponentKind === 'human') {
            const oppId = match.yourSeat === 1 ? match.player2Id : match.player1Id;
            if (oppId != null && oppId > 0) {
              const oppView = await matchService.getMatchForUser(parsed.data.matchId, oppId);
              if (oppView) {
                io.to(userRoom(oppId)).emit(ev.matchState, {
                  matchId: parsed.data.matchId,
                  match: oppView,
                });
              }
            }
          }
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Move failed'));
        }
      },
    );

    socket.on(ev.matchAgentTurn, async (payload: unknown) => {
      const parsed = MatchIdSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(ev.matchError, { error: parsed.error.message });
        return;
      }
      try {
        matchService.assertCanStreamAgentTurn(parsed.data.matchId, userId);
      } catch (e) {
        socket.emit(ev.matchError, {
          error: e instanceof Error ? e.message : 'Cannot stream agent turn',
        });
        return;
      }
      try {
        await matchService.streamAgentTurn(parsed.data.matchId, userId, (event, data) => {
          if (event === 'delta') {
            socket.emit(ev.matchAgentDelta, data);
          } else if (event === 'done') {
            socket.emit(ev.matchAgentDone, data);
          } else if (event === 'error') {
            socket.emit(ev.matchError, data);
          }
        });
      } catch {
        // error event may already have been sent
      }
    });

    socket.on(
      ev.inviteCreate,
      (payload: unknown, ack?: (res: GameSocketAck<{ inviteId: string; rules: unknown }>) => void) => {
        const parsed = CreateInviteSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          const invite = matchService.createInvite(userId, parsed.data.inviteeId, parsed.data.gameId, {
            turnTimerMs: parsed.data.turnTimerMs,
            ...(parsed.data.practice ? { practice: true } : {}),
            ...(parsed.data.rulesProfile != null ? { rulesProfile: parsed.data.rulesProfile } : {}),
            ...(parsed.data.wagerQuarks != null ? { wagerQuarks: parsed.data.wagerQuarks } : {}),
          });
          ack?.({ success: true, data: invite });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Invite failed'));
        }
      },
    );

    socket.on(
      ev.inviteAccept,
      async (payload: unknown, ack?: (res: GameSocketAck<unknown>) => void) => {
        const parsed = InviteIdSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          ack?.({ success: true, data: matchService.acceptInvite(parsed.data.inviteId, userId) });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Accept failed'));
        }
      },
    );

    socket.on(
      ev.inviteCancel,
      (payload: unknown, ack?: (res: GameSocketAck<{ inviteId: string; inviteeId: number }>) => void) => {
        const parsed = InviteIdSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          ack?.({ success: true, data: matchService.cancelInvite(parsed.data.inviteId, userId) });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Cancel failed'));
        }
      },
    );

    socket.on(
      ev.inviteDecline,
      (payload: unknown, ack?: (res: GameSocketAck<{ inviteId: string; inviterId: number }>) => void) => {
        const parsed = InviteIdSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.(ackError(parsed.error.message));
          return;
        }
        try {
          ack?.({ success: true, data: matchService.declineInvite(parsed.data.inviteId, userId) });
        } catch (e) {
          ack?.(ackError(e instanceof Error ? e.message : 'Decline failed'));
        }
      },
    );
  });
}
