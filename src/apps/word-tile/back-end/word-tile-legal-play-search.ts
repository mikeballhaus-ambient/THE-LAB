import {
  BOARD_SIZE,
  CENTER_COL,
  CENTER_ROW,
  edgeAdjacentEmptyCells,
  getAllowedWords,
  totalTurnScore,
  validatePlace,
  type Placement,
  type TileWordGridState,
} from './rules';

export interface WordTileLegalPlay {
  placements: Placement[];
  score: number;
  words: string[];
}

function rackCounts(rack: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of rack) {
    m.set(l, (m.get(l) ?? 0) + 1);
  }
  return m;
}

function canUseRack(word: string, rack: string[]): boolean {
  const m = rackCounts(rack);
  for (const ch of word) {
    const n = m.get(ch) ?? 0;
    if (n <= 0) {
      return false;
    }
    m.set(ch, n - 1);
  }
  return true;
}

function linePlacementsForWord(
  state: TileWordGridState,
  seat: number,
  word: string,
  row: number,
  col: number,
  horizontal: boolean,
): Placement[] | null {
  const rack = [...(state.racks[seat] ?? [])];
  const placements: Placement[] = [];
  for (let i = 0; i < word.length; i += 1) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) {
      return null;
    }
    const existing = state.board[r]?.[c];
    const letter = word[i]!;
    if (existing) {
      if (existing.letter !== letter) {
        return null;
      }
      continue;
    }
    const idx = rack.indexOf(letter);
    if (idx === -1) {
      return null;
    }
    rack.splice(idx, 1);
    placements.push({ row: r, col: c, letter });
  }
  return placements;
}

function playSortKey(a: WordTileLegalPlay, b: WordTileLegalPlay): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  const aw = a.words[0] ?? '';
  const bw = b.words[0] ?? '';
  if (aw.length !== bw.length) {
    return aw.length - bw.length;
  }
  return aw.localeCompare(bw);
}

/** All legal single-turn placements (dictionary + board rules), highest score first. */
export function enumerateWordTileLegalPlays(
  state: TileWordGridState,
  seat: number,
): WordTileLegalPlay[] {
  const rack = state.racks[seat] ?? [];
  if (rack.length === 0) {
    return [];
  }

  const found: WordTileLegalPlay[] = [];
  const seen = new Set<string>();
  const words = [...getAllowedWords()].filter(
    (w) => w.length >= 2 && w.length <= 7 && canUseRack(w, rack),
  );

  const anchors = state.firstMove
    ? [{ row: CENTER_ROW, col: CENTER_COL }]
    : edgeAdjacentEmptyCells(state.board);

  for (const word of words) {
    for (const { row, col } of anchors) {
      for (const horizontal of [true, false]) {
        const placements = linePlacementsForWord(state, seat, word, row, col, horizontal);
        if (!placements?.length) {
          continue;
        }
        const check = validatePlace(state, placements, seat);
        if (!check.ok) {
          continue;
        }
        const key = placements
          .map((p) => `${p.row},${p.col}:${p.letter}`)
          .sort()
          .join('|');
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        const score = totalTurnScore(state.board, placements);
        found.push({ placements, score, words: [word] });
      }
    }
  }

  found.sort(playSortKey);
  return found;
}

export function findTopWordTileLegalPlays(
  state: TileWordGridState,
  seat: number,
  limit: number,
): WordTileLegalPlay[] {
  if (limit <= 0) {
    return [];
  }
  return enumerateWordTileLegalPlays(state, seat).slice(0, limit);
}
