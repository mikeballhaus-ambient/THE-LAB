import type { GameDifficulty } from '@/shared/game-platform/types';
import type { TileWordGridState } from './rules';
import { findTopWordTileLegalPlays } from './word-tile-legal-play-search';

function formatPlacementsCompact(
  placements: { row: number; col: number; letter: string }[],
): string {
  return placements.map((p) => `(${p.row},${p.col})=${p.letter}`).join(' ');
}

function agentHintTier(difficulty: GameDifficulty): boolean {
  return difficulty === 'medium' || difficulty === 'hard' || difficulty === 'boss';
}

function defaultMaxPlaysForTier(difficulty: GameDifficulty, emphasizePass: boolean): number {
  if (emphasizePass) {
    return 5;
  }
  if (difficulty === 'medium') {
    return 2;
  }
  return 3;
}

/**
 * Ranked search hints for the LLM agent (medium+) — never auto-played; model must still call the tool.
 */
export function formatWordTileAgentLegalHints(
  state: TileWordGridState,
  seat: number,
  difficulty: GameDifficulty,
  options?: { maxPlays?: number; emphasizePass?: boolean },
): string {
  if (!agentHintTier(difficulty)) {
    return '';
  }
  const emphasizePass = options?.emphasizePass === true;
  const maxPlays =
    options?.maxPlays ?? defaultMaxPlaysForTier(difficulty, emphasizePass);
  const plays = findTopWordTileLegalPlays(state, seat, maxPlays);
  const lines: string[] = [
    'Server-ranked legal plays (hints only — verify cross-words, then submit via tool; do not invent words):',
  ];
  if (plays.length === 0) {
    lines.push(
      '- None found for this rack on current anchors — submit {"type":"pass"} or {"type":"exchange","letters":[...]} if you cannot place.',
    );
    return lines.join('\n');
  }
  plays.forEach((play, i) => {
    const word = play.words[0] ?? '?';
    lines.push(
      `${i + 1}. ${word.toUpperCase()} — ${play.score} pts — new tiles: ${formatPlacementsCompact(play.placements)}`,
    );
  });
  if (options?.emphasizePass) {
    lines.push(
      '- You are cycling invalid shapes — pick one hint line exactly, or pass/exchange instead of guessing letters.',
    );
  }
  return lines.join('\n');
}
