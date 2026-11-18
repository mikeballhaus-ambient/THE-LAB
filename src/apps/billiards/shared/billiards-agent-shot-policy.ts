import type { GameDifficulty } from '@/shared/game-platform/types';
import type { BilliardsAgentShot } from './billiards-agent-move-schema';
import type { BilliardsMatchState } from './billiards-types';

/**
 * Vs–Lab Assistant contract: the LLM chooses angle, power, and which hinted line to play.
 * Hints are ranked advice only — this hook does not rewrite tool arguments.
 * {@link gradeAgentShot} still validates legality (phase, cue on table, first contact on a legal object).
 */
export function applyBilliardsAgentShotTierPolicy(
  shot: BilliardsAgentShot,
  state: BilliardsMatchState,
  seat: number,
  difficulty: GameDifficulty,
): BilliardsAgentShot {
  void state;
  void seat;
  void difficulty;
  return shot;
}
