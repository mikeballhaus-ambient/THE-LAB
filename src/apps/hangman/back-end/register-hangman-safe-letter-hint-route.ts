import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import type { TurnBasedMatchService } from '@/shared/game-platform/match-service';
import type { HangmanState } from './rules';
import { pickHangmanSafeLetter } from './hangman-safe-letter-hint';

const BodySchema = z.object({
  matchId: z.string().min(1).max(64),
});

export function registerHangmanSafeLetterHintRoute(
  server: FastifyInstance,
  matchService: TurnBasedMatchService,
): void {
  server.post('/api/game-hints/safe-letter', async (request: FastifyRequest, reply: FastifyReply) => {
    let userId: number;
    try {
      userId = resolveLabAppActorUserId(request);
    } catch {
      await reply.status(401).send({ success: false, error: 'Authentication required' });
      return;
    }
    const parsed = BodySchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.status(400).send({ success: false, error: 'Invalid payload' });
      return;
    }
    const match = await matchService.getMatchForUser(parsed.data.matchId, userId);
    if (!match || match.status !== 'active') {
      await reply.status(404).send({ success: false, error: 'Match not found' });
      return;
    }
    const state = match.state as HangmanState;
    if (!state.wordSet || state.result !== null) {
      await reply.status(400).send({ success: false, error: 'No active guessing phase' });
      return;
    }
    if (match.yourSeat !== state.guesserSeat) {
      await reply.status(403).send({ success: false, error: 'Only the guesser can request this hint' });
      return;
    }
    const letter = pickHangmanSafeLetter(state.word, state.guessedLetters ?? []);
    if (!letter) {
      await reply.status(400).send({ success: false, error: 'No safe letter remains' });
      return;
    }
    await reply.send({ success: true, data: { letter } });
  });
}
