import type { GameAgentDifficultyMechanics } from '@/shared/game-platform/difficulty-policy';

export const BATTLESHIP_STRATEGY_CORE = `BATTLESHIP FUNDAMENTALS (all tiers):
- You only see your own fleet and your shot map at the enemy (. unshot, X hit, o miss). Enemy ship locations are hidden.
- Fleet lengths: 4, 3, 3, 2, 2 — ships are straight lines on a hidden grid; no diagonal ships.
- Fire only at unshot enemy cells (row 0–7, col 0–7). Duplicate shots are illegal.
- Hits mean a ship occupies that cell; misses mean no ship there.

HUNT vs TARGET:
- **Search:** when no unresolved hit, spread shots to find ships (avoid clustering misses only).
- **Target:** when you have a hit that is not yet part of a fully sunk ship, fire along the line of that hit (horizontal and vertical neighbors) until the ship sinks.
- When a ship is sunk, return to search on remaining unsunk lengths.`;

export const BATTLESHIP_AGENT_STRATEGY_BY_TIER: GameAgentDifficultyMechanics = {
  easy: `BATTLESHIP PLAY (easy):
- Pick random unshot cells, or use the "adjacent to a hit" list when the user message provides it.
- Do not worry about parity or probability — spread shots across the board.
- It is fine to miss obvious hunt patterns occasionally.`,

  medium: `BATTLESHIP PLAY (medium):
- When the message lists hunt targets adjacent to hits, prefer those cells over random search.
- After a hit, keep firing in a straight line through that hit until misses define ship orientation.
- Avoid shooting the same region repeatedly after it is mostly misses.`,

  hard: `BATTLESHIP PLAY (hard):
- Track which enemy ship lengths remain unsunk from your hit/miss pattern.
- Finish wounding: extend lines from hits before wide search.
- In search mode, prefer cells that could still fit the largest remaining ship (avoid tight clusters of misses).`,

  boss: `BATTLESHIP PLAY (boss):
- Always target adjacent unshot cells when any unresolved hit exists; pick the line consistent with prior hits on that cluster.
- Search with checkerboard parity (even (row+col) or odd) until hits appear — reduces wasted shots.
- When two possible orientations remain, fire the cell that would sink the ship if both orientations were valid.
- Hunt lists in the user message are hints — you still choose the shot, but boss tier should follow them unless you have a clearer line completion.`,
};

export const BATTLESHIP_USER_TURN_CHECKLIST: Partial<Record<'hard' | 'boss', string>> = {
  hard: `Turn checklist: if any hit is unsunk, fire along that line; else pick an unshot cell that fits the largest remaining ship.`,
  boss: `Turn checklist: unresolved hit → finish the line; else search with parity; prefer listed hunt targets when tied.`,
};
