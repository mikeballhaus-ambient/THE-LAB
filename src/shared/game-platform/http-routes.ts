/**
 * Generic REST surface for a turn-based catalog game.
 *
 * Primary client path is Socket.IO; these routes exist for tools/tests and the
 * agent-turn SSE stream (which is simpler over HTTP than a socket).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { startAgentTurnSse } from './agent-turn-sse';
import type { TurnBasedMatchService } from './match-service';
import type { GameRunsService } from './runs-service';
import type { GameDifficulty, GamePlatformConfig } from './types';

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

export interface RegisterGameHttpRoutesOptions {
  runsService: GameRunsService;
  matchService: TurnBasedMatchService;
  config: GamePlatformConfig;
}

export function registerGameHttpRoutes(
  server: FastifyInstance,
  { runsService, matchService }: RegisterGameHttpRoutesOptions,
): void {
  server.get('/api/games', async (request) => {
    const userId = resolveLabAppActorUserId(request);
    return { games: runsService.listCatalogForUser(userId) };
  });

  server.get('/api/games/:gameId/h2h/:opponentUserId', async (request, reply) => {
    const userId = resolveLabAppActorUserId(request);
    const { gameId, opponentUserId } = request.params as { gameId: string; opponentUserId: string };
    const oppId = Number(opponentUserId);
    if (!Number.isFinite(oppId) || oppId <= 0) {
      return reply.status(400).send({ error: 'Invalid opponent user id' });
    }
    try {
      return runsService.getHumanHeadToHeadStats(userId, oppId, gameId);
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to load head-to-head stats',
      });
    }
  });

  server.post('/api/games/:gameId/runs', async (request, reply) => {
    const userId = resolveLabAppActorUserId(request);
    const parsed = SubmitRunSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return runsService.submitRun(userId, parsed.data);
  });

  server.post('/api/matches/ai', async (request, reply) => {
    const userId = resolveLabAppActorUserId(request);
    const parsed = CreateAiMatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return matchService.createAiMatch(userId, parsed.data.gameId, parsed.data.difficulty as GameDifficulty, {
      ...(parsed.data.rulesProfile != null ? { rulesProfile: parsed.data.rulesProfile } : {}),
      ...(parsed.data.wagerQuarks != null ? { wagerQuarks: parsed.data.wagerQuarks } : {}),
      ...(parsed.data.practice ? { practice: true } : {}),
    });
  });

  server.post('/api/matches/solo', async (request, reply) => {
    const userId = resolveLabAppActorUserId(request);
    const parsed = CreateSoloMatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return matchService.createSoloMatch(userId, parsed.data.gameId, {
      turnTimerMs: parsed.data.turnTimerMs,
      rulesProfile: parsed.data.rulesProfile,
    });
  });

  server.get('/api/matches/:matchId/agent-turn/stream', async (request, reply) => {
    const userId = resolveLabAppActorUserId(request);
    const { matchId } = request.params as { matchId: string };
    try {
      matchService.assertCanStreamAgentTurn(matchId, userId);
    } catch (err) {
      return reply.status(409).send({
        error: err instanceof Error ? err.message : 'Cannot stream agent turn',
      });
    }
    reply.hijack();
    const send = startAgentTurnSse(reply.raw);
    try {
      await matchService.streamAgentTurn(matchId, userId, send);
    } catch {
      // error event already sent when applicable
    } finally {
      reply.raw.end();
    }
  });
}
