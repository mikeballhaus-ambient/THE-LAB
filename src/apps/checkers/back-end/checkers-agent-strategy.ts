import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';

export const CHECKERS_STRATEGY_CORE = `CHECKERS FUNDAMENTALS (all tiers):
- Pick exactly one move from the legal-move list each turn — pieceId and destination must match a listed entry.
- Seat 1 starts low on the board and moves UP (row decreases); seat 2 moves DOWN (row increases).
- Kings move and capture both forward and backward; men move diagonally forward only (unless capturing).
- Captures are optional to start a turn, but if you begin a jump you must continue with the same piece until no further jump is listed.
- Material advantage matters: fewer pieces usually loses; trading when ahead is often good.

TACTICAL SCAN:
- Look for captures that remove an opponent piece without letting them reply with an immediate double jump on you.
- Protect back-row pieces that block enemy men from promoting until you must move them.
- Prefer moves that create a king or threaten multiple pieces next turn when captures are equal.`;

export const CHECKERS_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `CHECKERS PLAY (easy):
- Move a man forward when no capture is obvious.
- Take a capture when it clearly wins a piece and you see no instant reply capture on you.
- Avoid leaving a piece alone on the edge if it can be jumped next turn — simple safety only.`,

  medium: `CHECKERS PLAY (medium):
- Prefer captures that gain material; skip captures that lose a king for a man unless forced.
- Keep at least one piece on your back row when possible to deny enemy promotion.
- When ahead, simplify toward fewer pieces; when behind, seek captures and king chances.`,

  hard: `CHECKERS PLAY (hard):
- Before submitting, reject captures that allow an immediate double jump against you unless you still come out ahead.
- Centralize kings to control diagonals; use kings to cut off enemy men.
- In endgames with kings, chase stray men toward edges while keeping your king safe.`,

  boss: `CHECKERS PLAY (boss):
- Rank legal captures by net material after any forced reply jumps.
- Force trades only when the resulting pawn/king count favors you.
- Deny opponent safe moves: prefer lines that leave them with all moves under attack or blocked.
- When LOCAL SEARCH HINTS are present, treat top lines as strong candidates — verify they are legal, then choose the best you understand; you may still deviate on easy intent but boss expects you to follow strong hints unless a tactic in the list is clearly better.`,
};

export const CHECKERS_USER_TURN_CHECKLIST: Partial<Record<'hard' | 'boss', string>> = {
  hard: `Turn checklist: (1) list any captures in the legal set, (2) drop captures that lose material after reply jumps, (3) pick the safest strong move remaining.`,
  boss: `Turn checklist: rank captures by net gain, prefer king-making moves when equal, submit one legal move from the list — use search hints as your default when they match a legal entry.`,
};
