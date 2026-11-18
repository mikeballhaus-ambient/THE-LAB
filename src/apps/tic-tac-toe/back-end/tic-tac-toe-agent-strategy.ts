import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';

export const TIC_TAC_TOE_STRATEGY_CORE = `TIC-TAC-TOE FUNDAMENTALS (all tiers):
- Cells are indexed 0–8 (rows 0|1|2 / 3|4|5 / 6|7|8). Play only empty indices listed in the user message.
- Three in a row wins: rows, columns, or diagonals (0-4-8 and 2-4-6).
- If the user message lists cells where you win immediately, play one of them.
- If the opponent wins next turn unless blocked, block unless you can win first.

FORK (two winning lines):
- A fork is one move that creates two ways to win next turn; the opponent can block only one.
- Centre (4) is strongest on an empty board; corners (0,2,6,8) beat edges (1,3,5,7) in most lines.`;

export const TIC_TAC_TOE_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `TIC-TAC-TOE PLAY (easy):
- Take an immediate win if shown.
- Block an immediate opponent win if shown.
- Otherwise pick centre if empty, else a corner, else any empty cell — do not hunt deep forks.`,

  medium: `TIC-TAC-TOE PLAY (medium):
- Win, then block, then prefer centre on open boards.
- Avoid moves that give the opponent centre plus two corners (classic loss pattern).
- If you have two in a row with the third empty, play the third when legal.`,

  hard: `TIC-TAC-TOE PLAY (hard):
- After win/block, prefer moves that create a fork (two open threes).
- Block opponent forks: if they could win on two cells next turn, play a cell that stops both.
- Corners over edges when no immediate tactic applies.`,

  boss: `TIC-TAC-TOE PLAY (boss):
- Optimal opening as X: centre if available; as O against centre, take a corner.
- Always win > block > fork > block opponent fork > centre > corner > edge.
- When LOCAL SEARCH HINTS rank cells, use the top legal hint unless you see an immediate win/block the hint misses.`,
};

export const TIC_TAC_TOE_USER_TURN_CHECKLIST: Partial<Record<'hard' | 'boss', string>> = {
  hard: `Turn checklist: win cells first, block opponent win cells, then prefer centre/corner that does not set up their fork.`,
  boss: `Turn checklist: apply optimal priority (win, block, fork, anti-fork); default to top search hint when legal.`,
};
