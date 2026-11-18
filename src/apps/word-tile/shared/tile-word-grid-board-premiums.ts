import { TILE_WORD_GRID_BOARD_LAST_INDEX } from '@/apps/word-tile/shared/tile-word-grid-agent-move-schema';

export const TILE_WORD_GRID_BOARD_SIZE = TILE_WORD_GRID_BOARD_LAST_INDEX + 1;

export type TileWordGridCellPremium = 'TW' | 'DW' | 'TL' | 'DL' | null;

const TW = new Set([
  '0,0',
  '0,7',
  '0,14',
  '7,0',
  '7,14',
  '14,0',
  '14,7',
  '14,14',
]);

const DW = new Set([
  '1,1',
  '2,2',
  '3,3',
  '4,4',
  '7,7',
  '10,10',
  '11,11',
  '12,12',
  '13,13',
  '1,13',
  '2,12',
  '3,11',
  '4,10',
  '10,4',
  '11,3',
  '12,2',
  '13,1',
]);

const TL = new Set([
  '1,5',
  '1,9',
  '5,1',
  '5,5',
  '5,9',
  '5,13',
  '9,1',
  '9,5',
  '9,9',
  '9,13',
  '13,5',
  '13,9',
]);

const DL = new Set([
  '0,3',
  '0,11',
  '2,6',
  '2,8',
  '3,0',
  '3,7',
  '3,14',
  '6,2',
  '6,6',
  '6,8',
  '6,12',
  '7,3',
  '7,11',
  '8,2',
  '8,6',
  '8,8',
  '8,12',
  '11,0',
  '11,7',
  '11,14',
  '12,6',
  '12,8',
  '14,3',
  '14,11',
]);

export function tileWordGridPremiumAt(row: number, col: number): TileWordGridCellPremium {
  const key = `${row},${col}`;
  if (TW.has(key)) {
    return 'TW';
  }
  if (DW.has(key)) {
    return 'DW';
  }
  if (TL.has(key)) {
    return 'TL';
  }
  if (DL.has(key)) {
    return 'DL';
  }
  return null;
}

export function tileWordGridPremiumGrid(): TileWordGridCellPremium[][] {
  return Array.from({ length: TILE_WORD_GRID_BOARD_SIZE }, (_, row) =>
    Array.from({ length: TILE_WORD_GRID_BOARD_SIZE }, (_, col) => tileWordGridPremiumAt(row, col)),
  );
}

/** Premium squares in a row/col window (for agent prompts). */
export function formatTileWordGridPremiumsInRegion(
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
): string {
  const parts: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const prem = tileWordGridPremiumAt(r, c);
      if (prem) {
        parts.push(`(${r},${c})=${prem}`);
      }
    }
  }
  return parts.length ? parts.join(' ') : '(none in this crop)';
}

export const TILE_WORD_GRID_PREMIUM_LEGEND =
  'Premium squares (standard Scrabble layout): TW=triple word score, DW=double word, TL=triple letter, DL=double letter (apply when a tile is first played on that cell).';
