import type { TileWordGridState } from './rules';
import {
  findTopWordTileLegalPlays,
  type WordTileLegalPlay,
} from './word-tile-legal-play-search';

export type WordTileBestPlayHint = WordTileLegalPlay;

/** Score-max single play — dictionary scan with board alignment (one turn, no lookahead). */
export function findWordTileBestPlayHint(
  state: TileWordGridState,
  seat: number,
): WordTileBestPlayHint | null {
  return findTopWordTileLegalPlays(state, seat, 1)[0] ?? null;
}
