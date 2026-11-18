import { BS_SIZE, coordKey, type BsShotMap } from '../back-end/rules';

export interface BattleshipHuntLineHint {
  row: number;
  col: number;
  kind: 'hunt' | 'search';
}

function parseCoord(key: string): { row: number; col: number } | null {
  const [r, c] = key.split(',').map((n) => Number.parseInt(n, 10));
  if (!Number.isInteger(r) || !Number.isInteger(c)) {
    return null;
  }
  return { row: r, col: c };
}

function unshot(shots: BsShotMap, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < BS_SIZE && col < BS_SIZE && !(coordKey(row, col) in shots);
}

/** Checkerboard parity search when there are no hits yet (no opponent ship data). */
function searchParityCell(shots: BsShotMap): BattleshipHuntLineHint | null {
  const parity: BattleshipHuntLineHint[] = [];
  const other: BattleshipHuntLineHint[] = [];
  for (let row = 0; row < BS_SIZE; row++) {
    for (let col = 0; col < BS_SIZE; col++) {
      if (!unshot(shots, row, col)) {
        continue;
      }
      const cell: BattleshipHuntLineHint = { row, col, kind: 'search' };
      if ((row + col) % 2 === 0) {
        parity.push(cell);
      } else {
        other.push(cell);
      }
    }
  }
  const pool = parity.length > 0 ? parity : other;
  if (pool.length === 0) {
    return null;
  }
  pool.sort((a, b) => a.row - b.row || a.col - b.col);
  return pool[0]!;
}

/**
 * Next firing cell along a hunt line from your hits (no opponent ship data).
 */
export function computeBattleshipHuntLineHint(shots: BsShotMap): BattleshipHuntLineHint | null {
  const hits: { row: number; col: number }[] = [];
  for (const key of Object.keys(shots)) {
    if (shots[key] !== 'hit') {
      continue;
    }
    const p = parseCoord(key);
    if (p) {
      hits.push(p);
    }
  }
  if (hits.length === 0) {
    return searchParityCell(shots);
  }

  const hitSet = new Set(hits.map((h) => coordKey(h.row, h.col)));

  const lineCandidates: BattleshipHuntLineHint[] = [];

  for (const h of hits) {
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      let r = h.row + dr;
      let c = h.col + dc;
      while (hitSet.has(coordKey(r, c))) {
        r += dr;
        c += dc;
      }
      if (unshot(shots, r, c)) {
        lineCandidates.push({ row: r, col: c, kind: 'hunt' });
      }
      r = h.row - dr;
      c = h.col - dc;
      while (hitSet.has(coordKey(r, c))) {
        r -= dr;
        c -= dc;
      }
      if (unshot(shots, r, c)) {
        lineCandidates.push({ row: r, col: c, kind: 'hunt' });
      }
    }
  }

  if (lineCandidates.length > 0) {
    lineCandidates.sort((a, b) => a.row - b.row || a.col - b.col);
    return lineCandidates[0]!;
  }

  const adjacent: BattleshipHuntLineHint[] = [];
  for (const h of hits) {
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const r = h.row + dr;
      const c = h.col + dc;
      if (unshot(shots, r, c)) {
        adjacent.push({ row: r, col: c, kind: 'hunt' });
      }
    }
  }
  if (adjacent.length === 0) {
    return null;
  }
  adjacent.sort((a, b) => a.row - b.row || a.col - b.col);
  return adjacent[0]!;
}
