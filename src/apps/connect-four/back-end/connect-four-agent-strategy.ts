import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';

export const CONNECT_FOUR_STRATEGY_CORE = `CONNECT FOUR FUNDAMENTALS (all tiers):
- You choose a column (0–6); the disc drops to the lowest empty row in that column.
- Win with four of your marks in a row — horizontal, vertical, or diagonal.
- A column that is full is illegal — only open columns may be chosen.
- Read the user message for immediate win columns and urgent block columns before anything else.

POSITIONAL IDEAS:
- Center columns (especially 3) reach more winning lines; edges reach fewer.
- Every drop must answer: "Do I win now?", "Must I block now?", "Does this give opponent a win next turn?"
- Two simultaneous threats (a "fork") often win because only one column can be blocked.`;

export const CONNECT_FOUR_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `CONNECT FOUR PLAY (easy):
- If the user message lists a winning column, play it.
- If the opponent wins next turn unless blocked, block that column unless you can win first.
- Otherwise prefer column 3, then 2 or 4, then any open column — avoid obvious gifts.`,

  medium: `CONNECT FOUR PLAY (medium):
- Always take wins and blocks shown in the user message.
- Prefer center columns when no immediate threat exists.
- Before dropping, glance at whether your column lets the opponent win on top of your disc (gravity matters).`,

  hard: `CONNECT FOUR PLAY (hard):
- After wins/blocks, avoid moves that create an opponent win on their next drop (check vertically above your piece).
- Build lines of three with open ends when safe; block opponent threes the same way.
- Use side columns to force opponent into bad replies when the center is contested.`,

  boss: `CONNECT FOUR PLAY (boss):
- Priority: win > block opponent win > create double threat > block opponent three-with-open-end > best center/control move.
- When LOCAL SEARCH HINTS rank columns, prefer the top hint if it is open and does not hang a loss next turn.
- If no tactic exists, play the column that limits opponent winning drops the most (often 3, then 2/4).`,
};

export const CONNECT_FOUR_USER_TURN_CHECKLIST: Partial<Record<'hard' | 'boss', string>> = {
  hard: `Turn checklist: (1) play a listed win if any, (2) block listed urgent columns, (3) reject columns that let opponent win on the next drop, (4) choose among remaining open columns.`,
  boss: `Turn checklist: win, block, then check for double-threat setups; align with top search hint when legal and safe.`,
};
