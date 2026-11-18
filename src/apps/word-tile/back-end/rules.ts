import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  TILE_WORD_GRID_BOARD_LAST_INDEX,
  TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID,
  TileWordGridAgentMoveSchema,
} from '@/apps/word-tile/shared/tile-word-grid-agent-move-schema';
import type { AgentLoopRetryContext } from '@/shared/game-platform/agent-loop';
import {
  agentDifficultyLine,
  buildAgentSystemPrompt,
  formatDifficultyUserLine,
} from '@/shared/game-platform/difficulty-policy';
import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import { WORD_TILE_GAME_IDS, type Difficulty } from '../shared/types';
import {
  WORD_TILE_AGENT_ROLE_BY_TIER,
  WORD_TILE_AGENT_STRATEGY_BY_TIER,
  WORD_TILE_USER_TURN_CHECKLIST,
} from './word-tile-agent-strategy';
import { formatWordTileAgentLegalHints } from './word-tile-agent-legal-hints';
import {
  formatTileWordGridPremiumsInRegion,
  TILE_WORD_GRID_PREMIUM_LEGEND,
  tileWordGridPremiumAt,
} from '../shared/tile-word-grid-board-premiums';
import {
  TILE_BAG_LETTERS,
  TILE_BOARD_SIZE,
  TILE_CENTER_COL,
  TILE_CENTER_ROW,
  TILE_LETTER_SCORES,
  TILE_RACK_SIZE,
} from '../shared/tile-word-grid-constants';
import type { TileWordGridCellPremium } from '../shared/tile-word-grid-board-premiums';

/**
 * Word Tile rules engine — pure logic, no I/O beyond the dictionary file.
 *
 * Deliberately one module, mirroring `rules.ts` in every other game app: state
 * shape, board geometry, tile bag, dictionary lookup, word extraction, scoring,
 * validation and move application all belong to the same rules surface. They
 * were previously split across `types` / `tile-bag` / `dictionary` / `scoring` /
 * `move-validation` — an artefact of this app predating the kit, when it was the
 * reference implementation rather than one of nine catalogue games.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const BOARD_SIZE = TILE_BOARD_SIZE;
export const RACK_SIZE = TILE_RACK_SIZE;
export const CENTER_ROW = TILE_CENTER_ROW;
export const CENTER_COL = TILE_CENTER_COL;
export const LETTER_SCORES = TILE_LETTER_SCORES;

export type BoardCell = { letter: string; seat: number } | null;

export interface Placement {
  row: number;
  col: number;
  letter: string;
}

export type TileMove =
  | { type: 'place'; placements: Placement[] }
  | { type: 'pass' }
  | { type: 'exchange'; letters: string[] }
  | { type: 'resign' };

export interface TileWordGridTurnHistoryEntry {
  seat: number;
  summary: string;
}

export interface TileWordGridState {
  board: BoardCell[][];
  racks: Record<number, string[]>;
  scores: Record<number, number>;
  bag: string[];
  passesInRow: number;
  firstMove: boolean;
  resignedSeat: number | null;
  premiums: TileWordGridCellPremium[][] | null;
  /** Append-only log for the Player turns panel (both PvP and vs AI). */
  turnHistory?: TileWordGridTurnHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Board rendering (for the AI opponent's prompt)
// ---------------------------------------------------------------------------

export type AgentBoardLetter = { letter: string } | null;

/** Occupied cells as (row,col)=LETTER — compact fallback. */
export function formatBoardOccupiedList(board: AgentBoardLetter[][]): string {
  const cells: string[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < (board[r]?.length ?? 0); c++) {
      const cell = board[r]?.[c];
      if (cell) {
        cells.push(`(${r},${c})=${cell.letter.toUpperCase()}`);
      }
    }
  }
  return cells.length ? cells.join(' ') : '(empty)';
}

/** Cropped ASCII grid (occupied region +/-1). Row/col labels match validation (0=top/left). */
export function formatBoardAscii(
  board: AgentBoardLetter[][],
  centerRow = CENTER_ROW,
  centerCol = CENTER_COL,
): string {
  const size = board.length;
  if (size === 0) {
    return '(empty board)';
  }

  const occupied: { row: number; col: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < (board[r]?.length ?? 0); c++) {
      if (board[r]?.[c]) {
        occupied.push({ row: r, col: c });
      }
    }
  }

  const empty = occupied.length === 0;
  const minR = empty ? Math.max(0, centerRow - 2) : Math.max(0, Math.min(...occupied.map((o) => o.row)) - 1);
  const maxR = empty
    ? Math.min(size - 1, centerRow + 2)
    : Math.min(size - 1, Math.max(...occupied.map((o) => o.row)) + 1);
  const minC = empty ? Math.max(0, centerCol - 2) : Math.max(0, Math.min(...occupied.map((o) => o.col)) - 1);
  const maxC = empty
    ? Math.min(TILE_WORD_GRID_BOARD_LAST_INDEX, centerCol + 2)
    : Math.min(TILE_WORD_GRID_BOARD_LAST_INDEX, Math.max(...occupied.map((o) => o.col)) + 1);

  const colHeader = Array.from({ length: maxC - minC + 1 }, (_, i) =>
    String(minC + i).padStart(2, ' '),
  ).join('');

  const lines: string[] = [TILE_WORD_GRID_PREMIUM_LEGEND];
  if (empty) {
    lines.push('Board is empty — first play must cover center (7,7) which is DW.');
  }
  lines.push('Empty cells show premium code (TW/DW/TL/DL) or . / · (center star).');
  lines.push(`cols→ ${colHeader}`, 'row');

  for (let r = minR; r <= maxR; r++) {
    let row = `${String(r).padStart(2, ' ')} |`;
    for (let c = minC; c <= maxC; c++) {
      const cell = board[r]?.[c];
      if (cell) {
        row += ` ${cell.letter.toUpperCase()}`;
        continue;
      }
      const prem = tileWordGridPremiumAt(r, c);
      if (prem) {
        row += ` ${prem}`;
      } else if (r === centerRow && c === centerCol) {
        row += ' ·';
      } else {
        row += ' .';
      }
    }
    lines.push(row);
  }

  lines.push(
    `Premiums in this crop: ${formatTileWordGridPremiumsInRegion(minR, maxR, minC, maxC)}`,
  );
  return lines.join('\n');
}

/** Empty cells sharing an edge with an occupied cell — common placement anchors, as "(r,c)". */
export function formatAdjacentEmptyAnchors(board: AgentBoardLetter[][]): string {
  const anchors = edgeAdjacentEmptyCells(board as BoardCell[][]);
  if (anchors.length === 0) {
    return '(none — opening play uses center)';
  }
  return anchors
    .map((a) => `(${a.row},${a.col})`)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Tile bag
// ---------------------------------------------------------------------------

export function createShuffledBag(): string[] {
  const tiles = TILE_BAG_LETTERS.split('');
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export function drawFromBag(bag: string[], count: number): { drawn: string[]; bag: string[] } {
  const copy = [...bag];
  const drawn: string[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    drawn.push(copy.pop()!);
  }
  return { drawn, bag: copy };
}

export function refillRack(bag: string[], rack: string[]): { rack: string[]; bag: string[] } {
  let nextBag = bag;
  let nextRack = [...rack];
  while (nextRack.length < RACK_SIZE && nextBag.length > 0) {
    const { drawn, bag: remaining } = drawFromBag(nextBag, 1);
    nextRack = [...nextRack, ...drawn];
    nextBag = remaining;
  }
  return { rack: nextRack, bag: nextBag };
}

// ---------------------------------------------------------------------------
// Dictionary
// ---------------------------------------------------------------------------

const DICTIONARY_FILE = 'words-en-core.txt';

let cachedDictionary: Set<string> | null = null;

export function getAllowedWords(): Set<string> {
  if (cachedDictionary) {
    return cachedDictionary;
  }
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(path.join(dir, DICTIONARY_FILE), 'utf8');
  const words = raw
    .split(/\r?\n/)
    .map((w) => w.trim().toUpperCase())
    .filter((w) => w.length >= 2 && w.length <= 15 && /^[A-Z]+$/.test(w));
  cachedDictionary = new Set(words);
  return cachedDictionary;
}

export function isAllowedWord(word: string): boolean {
  return getAllowedWords().has(word.toUpperCase());
}

/** Test seam: drop the memoised dictionary (used after fixture overrides). */
export function clearDictionaryCacheForTests(): void {
  cachedDictionary = null;
}

// ---------------------------------------------------------------------------
// Word extraction + scoring
// ---------------------------------------------------------------------------

type WordCells = { word: string; cells: { row: number; col: number }[] };

function boardWithPlacements(board: BoardCell[][], placements: Placement[]): BoardCell[][] {
  const temp = board.map((row) => row.map((c) => c));
  for (const p of placements) {
    temp[p.row][p.col] = { letter: p.letter, seat: -1 };
  }
  return temp;
}

function collectWord(
  board: BoardCell[][],
  row: number,
  col: number,
  axis: 'h' | 'v',
): { row: number; col: number }[] {
  if (!board[row][col]) {
    return [];
  }
  if (axis === 'h') {
    let start = col;
    while (start > 0 && board[row][start - 1]) {
      start--;
    }
    const cells: { row: number; col: number }[] = [];
    let c = start;
    while (c < BOARD_SIZE && board[row][c]) {
      cells.push({ row, col: c });
      c++;
    }
    return cells;
  }
  let start = row;
  while (start > 0 && board[start - 1][col]) {
    start--;
  }
  const cells: { row: number; col: number }[] = [];
  let r = start;
  while (r < BOARD_SIZE && board[r][col]) {
    cells.push({ row: r, col });
    r++;
  }
  return cells;
}

/** Every word formed through the new tiles — the main word plus all cross-words. */
export function extractWordsFromPlacements(
  board: BoardCell[][],
  placements: Placement[],
): WordCells[] {
  const temp = boardWithPlacements(board, placements);
  const newKeys = new Set(placements.map((p) => `${p.row},${p.col}`));
  const words: WordCells[] = [];
  const seen = new Set<string>();

  for (const key of newKeys) {
    const [rs, cs] = key.split(',');
    const row = Number.parseInt(rs!, 10);
    const col = Number.parseInt(cs!, 10);

    for (const axis of ['h', 'v'] as const) {
      const cells = collectWord(temp, row, col, axis);
      if (cells.length < 2) {
        continue;
      }
      const id = cells.map((c) => `${c.row},${c.col}`).join('|');
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      words.push({
        word: cells.map((c) => temp[c.row][c.col]!.letter).join(''),
        cells,
      });
    }
  }

  return words;
}

function letterScore(letter: string, row: number, col: number, isNew: boolean): number {
  const base = LETTER_SCORES[letter] ?? 0;
  if (!isNew) {
    return base;
  }
  const prem = tileWordGridPremiumAt(row, col);
  if (prem === 'DL') {
    return base * 2;
  }
  if (prem === 'TL') {
    return base * 3;
  }
  return base;
}

function wordMultiplierForNewTiles(
  cells: { row: number; col: number }[],
  newKeys: Set<string>,
): number {
  let mult = 1;
  for (const { row, col } of cells) {
    if (!newKeys.has(`${row},${col}`)) {
      continue;
    }
    const prem = tileWordGridPremiumAt(row, col);
    if (prem === 'DW') {
      mult *= 2;
    }
    if (prem === 'TW') {
      mult *= 3;
    }
  }
  return mult;
}

export function scoreWordOnBoard(
  board: BoardCell[][],
  placements: Placement[],
  wordCells: { row: number; col: number }[],
): number {
  const newKeys = new Set(placements.map((p) => `${p.row},${p.col}`));
  let sum = 0;
  for (const { row, col } of wordCells) {
    const cell = board[row][col];
    if (!cell) {
      continue;
    }
    sum += letterScore(cell.letter, row, col, newKeys.has(`${row},${col}`));
  }
  return sum * wordMultiplierForNewTiles(wordCells, newKeys);
}

/** All words formed, scored with premiums, plus the 50-point full-rack bonus. */
export function totalTurnScore(board: BoardCell[][], placements: Placement[]): number {
  const merged = boardWithPlacements(board, placements);
  const words = extractWordsFromPlacements(board, placements);
  let total = 0;
  for (const w of words) {
    total += scoreWordOnBoard(merged, placements, w.cells);
  }
  if (placements.length === RACK_SIZE) {
    total += 50;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function parseMove(move: unknown): TileMove | null {
  if (!move || typeof move !== 'object') {
    return null;
  }
  const m = move as { type?: string };
  if (m.type === 'pass' || m.type === 'resign') {
    return m as TileMove;
  }
  if (m.type === 'exchange' && Array.isArray((m as { letters?: unknown }).letters)) {
    return {
      type: 'exchange',
      letters: ((m as { letters: string[] }).letters ?? []).map((l) => l.toUpperCase()),
    };
  }
  if (m.type === 'place' && Array.isArray((m as { placements?: unknown }).placements)) {
    const placements = (m as { placements: Placement[] }).placements.map((p) => ({
      row: p.row,
      col: p.col,
      letter: (p.letter ?? '').toUpperCase(),
    }));
    return { type: 'place', placements };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type MoveCheck = { ok: true } | { ok: false; error: string };

function boardHasTiles(board: BoardCell[][]): boolean {
  return board.some((row) => row.some((c) => c != null));
}

/** The four edge-neighbours of a cell that lie on the board. */
export function edgeNeighbours(
  row: number,
  col: number,
  size = BOARD_SIZE,
): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  for (const [dr, dc] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) {
      out.push({ row: r, col: c });
    }
  }
  return out;
}

/** Empty cells sharing an edge with at least one occupied cell — the legal anchors. */
export function edgeAdjacentEmptyCells(board: BoardCell[][]): { row: number; col: number }[] {
  const size = board.length;
  const anchors = new Map<string, { row: number; col: number }>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < (board[r]?.length ?? 0); c++) {
      if (!board[r]?.[c]) {
        continue;
      }
      for (const n of edgeNeighbours(r, c, size)) {
        if (!board[n.row]?.[n.col]) {
          anchors.set(`${n.row},${n.col}`, n);
        }
      }
    }
  }
  return [...anchors.values()];
}

function hasAdjacentTile(board: BoardCell[][], row: number, col: number): boolean {
  return edgeNeighbours(row, col).some((n) => board[n.row]?.[n.col] != null);
}

export function validatePlace(
  state: TileWordGridState,
  placements: Placement[],
  playerSeat: number,
): MoveCheck {
  if (placements.length === 0) {
    return { ok: false, error: 'Place at least one tile' };
  }
  const rack = [...(state.racks[playerSeat] ?? [])];
  const keys = new Set<string>();
  for (const p of placements) {
    if (p.row < 0 || p.col < 0 || p.row >= BOARD_SIZE || p.col >= BOARD_SIZE) {
      return { ok: false, error: 'Out of bounds' };
    }
    const key = `${p.row},${p.col}`;
    if (keys.has(key)) {
      return { ok: false, error: 'Duplicate cell' };
    }
    keys.add(key);
    if (state.board[p.row]![p.col] != null) {
      return { ok: false, error: 'Cell occupied' };
    }
    if (!/^[A-Z]$/.test(p.letter)) {
      return { ok: false, error: 'Invalid letter' };
    }
    const idx = rack.indexOf(p.letter);
    if (idx === -1) {
      return { ok: false, error: 'Tile not on rack' };
    }
    rack.splice(idx, 1);
  }

  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  if (rows.size > 1 && cols.size > 1) {
    return { ok: false, error: 'Tiles must lie on one row or column' };
  }
  const axis = rows.size === 1 ? 'h' : 'v';
  const sorted = [...placements].sort((a, b) =>
    axis === 'h' ? a.col - b.col : a.row - b.row,
  );
  const lineRow = sorted[0]!.row;
  const lineCol = sorted[0]!.col;
  const start = axis === 'h' ? sorted[0]!.col : sorted[0]!.row;
  const end =
    axis === 'h' ? sorted[sorted.length - 1]!.col : sorted[sorted.length - 1]!.row;
  for (let i = start; i <= end; i++) {
    const r = axis === 'h' ? lineRow : i;
    const c = axis === 'h' ? i : lineCol;
    const placedHere = placements.some((p) => p.row === r && p.col === c);
    if (!placedHere && state.board[r]![c] == null) {
      return { ok: false, error: 'Tiles must form one continuous word' };
    }
  }

  const coversCenter = placements.some((p) => p.row === CENTER_ROW && p.col === CENTER_COL);
  if (state.firstMove) {
    if (!coversCenter) {
      return { ok: false, error: 'First play must cover the center square' };
    }
  } else if (!boardHasTiles(state.board)) {
    return { ok: false, error: 'Board state invalid' };
  } else {
    const touchesExisting = placements.some((p) => hasAdjacentTile(state.board, p.row, p.col));
    if (!touchesExisting) {
      return { ok: false, error: 'Must connect to existing tiles' };
    }
  }

  for (const w of extractWordsFromPlacements(state.board, placements)) {
    if (w.word.length >= 2 && !isAllowedWord(w.word)) {
      const first = w.cells[0]!;
      const last = w.cells[w.cells.length - 1]!;
      const horizontal = w.cells.every((c) => c.row === first.row);
      const wordAxis = horizontal ? 'horizontal' : 'vertical';
      return {
        ok: false,
        error: `Unknown word: ${w.word} (${wordAxis}, ${first.row},${first.col}–${last.row},${last.col}). Every cross-word through new tiles must be valid.`,
      };
    }
  }

  return { ok: true };
}

export function validateExchange(
  state: TileWordGridState,
  letters: string[],
  playerSeat: number,
): MoveCheck {
  if (letters.length === 0 || letters.length > RACK_SIZE) {
    return { ok: false, error: 'Exchange 1–7 tiles' };
  }
  if (state.bag.length < letters.length) {
    return { ok: false, error: 'Not enough tiles in bag' };
  }
  const rack = [...(state.racks[playerSeat] ?? [])];
  for (const ch of letters) {
    const idx = rack.indexOf(ch);
    if (idx === -1) {
      return { ok: false, error: 'Tile not on rack' };
    }
    rack.splice(idx, 1);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export function applyExchange(
  state: TileWordGridState,
  letters: string[],
  playerSeat: number,
): TileWordGridState {
  let bag = [...state.bag];
  const rack = [...(state.racks[playerSeat] ?? [])];
  for (const ch of letters) {
    const idx = rack.indexOf(ch);
    if (idx >= 0) {
      rack.splice(idx, 1);
    }
  }
  bag = [...bag, ...letters];
  const { drawn, bag: nextBag } = drawFromBag(bag, letters.length);
  return {
    ...state,
    bag: nextBag,
    racks: { ...state.racks, [playerSeat]: [...rack, ...drawn] },
    passesInRow: 0,
  };
}

export function applyPlace(
  state: TileWordGridState,
  placements: Placement[],
  playerSeat: number,
  turnScore: number,
): TileWordGridState {
  const board = state.board.map((row) => row.map((c) => c));
  const rack = [...(state.racks[playerSeat] ?? [])];
  for (const p of placements) {
    const idx = rack.indexOf(p.letter);
    if (idx >= 0) {
      rack.splice(idx, 1);
    }
    board[p.row]![p.col] = { letter: p.letter, seat: playerSeat };
  }
  const refilled = refillRack(state.bag, rack);
  return {
    ...state,
    board,
    bag: refilled.bag,
    racks: { ...state.racks, [playerSeat]: refilled.rack },
    scores: {
      ...state.scores,
      [playerSeat]: (state.scores[playerSeat] ?? 0) + turnScore,
    },
    passesInRow: 0,
    firstMove: false,
  };
}

// ---------------------------------------------------------------------------
// Turn text (kit `summarizeMove` / `attemptNote` hooks)
// ---------------------------------------------------------------------------

/** Rack tiles spelled by a place move, sorted along the play line. */
export function rackTilesWordFromPlacements(placements: Placement[]): string {
  if (placements.length === 0) {
    return '';
  }
  const sameRow = placements.every((p) => p.row === placements[0]!.row);
  const sorted = [...placements].sort((a, b) => (sameRow ? a.col - b.col : a.row - b.row));
  return sorted.map((p) => p.letter.toUpperCase()).join('');
}

/** The same, parsed out of raw tool-call arguments. */
export function rackTilesWordFromPlaceToolArguments(argumentsJson: string): string | null {
  try {
    const raw = JSON.parse(argumentsJson) as { type?: string; placements?: Placement[] };
    if (raw.type !== 'place' || !raw.placements?.length) {
      return null;
    }
    return rackTilesWordFromPlacements(raw.placements) || null;
  } catch {
    return null;
  }
}

/**
 * Words of length >= 2 formed when {@link placements} are applied (main word plus
 * cross-words), reported longest first.
 */
export function formatPlaceTurnSummary(placements: Placement[], wordsFormed: string[]): string {
  const tilesPlayed = rackTilesWordFromPlacements(placements);
  const unique = [
    ...new Set(wordsFormed.map((w) => w.toUpperCase()).filter((w) => w.length >= 2)),
  ].sort((a, b) => b.length - a.length);

  if (unique.length === 0) {
    return tilesPlayed ? `Played ${tilesPlayed}.` : 'Placed tiles on the board.';
  }
  if (unique.length === 1) {
    const full = unique[0]!;
    if (tilesPlayed && tilesPlayed !== full && !full.includes(tilesPlayed)) {
      return `Played ${full} (tiles ${tilesPlayed}).`;
    }
    return `Played ${full}.`;
  }
  if (unique.length === 2) {
    return `Played ${unique[0]} and ${unique[1]}.`;
  }
  return `Played ${unique.join(', ')}.`;
}

/** Kit hook `summarizeMove`: one line describing a submitted move (any seat). */
export function summarizeMove(move: unknown, wordsFormed?: string[]): string {
  const m = move as TileMove | null;
  if (!m || typeof m !== 'object' || !('type' in m)) {
    return 'Finished its turn.';
  }
  if (m.type === 'place') {
    const placements = m.placements ?? [];
    if (wordsFormed?.length) {
      return formatPlaceTurnSummary(placements, wordsFormed);
    }
    const word = rackTilesWordFromPlacements(placements);
    return word ? `Played ${word}.` : 'Placed tiles on the board.';
  }
  if (m.type === 'exchange') {
    const n = m.letters?.length ?? 0;
    return n > 0 ? `Exchanged ${n} tile${n === 1 ? '' : 's'}.` : 'Exchanged tiles.';
  }
  if (m.type === 'resign') {
    return 'Resigned.';
  }
  return 'Passed.';
}

/** Prefer the persisted turn-history line; fall back to formatting the raw move. */
export function resolveMoveSummary(state: unknown, appliedMove: unknown): string {
  const history = (state as { turnHistory?: { summary: string }[] })?.turnHistory;
  const last = history?.[history.length - 1]?.summary?.trim();
  return last || summarizeMove(appliedMove);
}

/** Trim a validator error to something that fits in a player-turn bubble. */
function shortRuleError(error: string): string {
  const unknown = error.match(/^Unknown word: ([A-Z]+)/);
  if (unknown) {
    return `invalid word "${unknown[1]}"`;
  }
  if (error.length > 72) {
    return `${error.slice(0, 69)}...`;
  }
  return error;
}

/** Kit hook `attemptNote`: one line for a rejected attempt while the AI is thinking. */
export function formatAttemptNote(toolArguments: string, error: string): string {
  let parsed: TileMove | null = null;
  try {
    parsed = JSON.parse(toolArguments) as TileMove;
  } catch {
    return `Tried a move - ${shortRuleError(error)}`;
  }
  if (parsed?.type === 'place') {
    const word = rackTilesWordFromPlacements(parsed.placements ?? []);
    return word
      ? `Tried "${word}" - ${shortRuleError(error)}`
      : `Tried a placement - ${shortRuleError(error)}`;
  }
  if (parsed?.type === 'exchange') {
    const letters = (parsed.letters ?? []).join('');
    return letters
      ? `Tried exchanging ${letters} - ${shortRuleError(error)}`
      : `Tried exchanging tiles - ${shortRuleError(error)}`;
  }
  if (parsed?.type === 'pass') {
    return `Tried to pass - ${shortRuleError(error)}`;
  }
  return `Tried a move - ${shortRuleError(error)}`;
}

// ---------------------------------------------------------------------------
// AI opponent prompt (data + assembly)
// ---------------------------------------------------------------------------

const PURPOSE = 'word-tile.tile-word-grid.agent-turn';
const TOOL_ID = TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID;

/** Rejected **place** attempts in one turn, then the turn errors. */
const STUMPED_PASS_AFTER_ATTEMPTS = 8;
/** Same board cells with different letters — stop encouraging letter cycling. */
const SHAPE_CYCLE_THRESHOLD = 3;
/** Same rack spelling retried with different coordinates — stop after this many. */
const RACK_WORD_REPEAT_THRESHOLD = 4;

const AgentMoveSchema = TileWordGridAgentMoveSchema;

/** Graded move after schema parse + rules validation. */
type ResolvedAgentMove =
  | { type: 'place'; placements: Placement[] }
  | { type: 'pass' }
  | { type: 'exchange'; letters: string[] }
  | { type: 'resign' };

/** Tool rules + board contract for the system message (references {@link TOOL_ID} and center). */
const SYSTEM_PROMPT_TOOL_RULES = `SESSION (important):
- Each match turn starts from the user snapshot (board, rack, scores). If the server rejects your tool call, the same request may include your prior tool attempt + error â€” then you must submit a different valid move, not repeat the same placements.
- Read the match phase line in the user message (opening vs ongoing). When ongoing, you are mid-match: do not re-introduce the game or the rules.

PLANNING (important):
- Reasoning/thinking channel is off â€” decide the move from the user board snapshot, then call the tool once.
- Verify main word and every cross-word through new tiles before submitting.
- Do not put the move in assistant text â€” only in the tool arguments.

OUTPUT CONTRACT (required every turn):
- Call the tool \`${TOOL_ID}\` exactly once with your move (place, pass, exchange, or resign).
- Do not put the move in assistant text â€” use the tool only.

Move types (same as the human player):
- "place": placements[] with row, col, letter for each tile you lay **this turn** from your rack only â€” not letters already on the board. One entry per new tile (often 1â€“2 tiles for a hook off existing words).
- "pass": no placements â€” use when you cannot form a legal word (forbidden on the opening turn when the board is empty).
- "exchange": letters[] â€” tiles from your rack to swap (only when the bag has tiles; server validates). After invalid-word rejections, prefer exchange over passing when the bag has tiles.
- Exchange and pass do **not** count toward the serverâ€™s limit on rejected **placement** tries in the same turn (only failed "place" calls do).
- "resign": concede the match (rare; prefer pass over resign on easy/medium).

Board coordinates (same as tool row/col):
- row 0 = top edge, row 14 = bottom; col 0 = left, col 14 = right. Center star (${CENTER_ROW},${CENTER_COL}).
- Read the ASCII board in the user message: letters on a row share that row number; letters in a column share that col.

Board rules:
- First move must cover the center cell (row ${CENTER_ROW}, col ${CENTER_COL}).
- Later moves must connect edge-adjacent to existing tiles (not diagonal).
- All **new** tiles you place must lie on one row OR one column with no gaps in that line (never L-shaped or diagonal).
- Only empty cells may appear in placements[] â€” if the ASCII board shows a letter at (r,c), do not include (r,c).
- Only use letters from your rack; one placement per cell.
- Every word formed (horizontal and vertical lines through any new tile) must be valid English â€” including short cross-words (e.g. adding H above an I for "HI").
- Scan adjacent empty anchors in the user message; try both directions (extend the line and perpendicular cross-words).
- Premium squares (TW/DW/TL/DL) are listed on the ASCII board for empty cells; factor them into scoring when choosing among legal plays.
- Follow the DIFFICULTY section below for how aggressively to optimize each turn.
- Resign only if hopeless on BOSS/HARD; on EASY/MEDIUM prefer pass over resign.

TOOL ARGUMENTS (OpenAI-compatible tools / Qwen â€” critical):
- \`${TOOL_ID}\` arguments must be ONE compact JSON object only (no XML, no \`<tool_call>\`, no markdown fences, no assistant text).
- Do not emit the tool more than once per turn.
- pass: {"type":"pass"}
- exchange: {"type":"exchange","letters":["A","B"]}
- place (one tile): {"type":"place","placements":[{"row":7,"col":7,"letter":"A"}]}
- place (word): {"type":"place","placements":[{"row":8,"col":7,"letter":"S"},{"row":8,"col":8,"letter":"A"}]}
- hook (one new tile): board has RAD at (7,6)â€“(7,8); extend with I at (7,9): {"type":"place","placements":[{"row":7,"col":9,"letter":"I"}]}
- Do not include "letters" on type "place" (only on "exchange").
- Every placement object needs "row", "col", and "letter" (integers 0â€“14, single letter Aâ€“Z).`;

/** Assembled system prompt: persona + tool contract + tier block with tile mechanics. */
export function buildAgentSystemPromptForTier(difficulty: Difficulty): string {
  return buildAgentSystemPrompt({
    baseRules: `${WORD_TILE_AGENT_ROLE_BY_TIER[difficulty]}\n\n${SYSTEM_PROMPT_TOOL_RULES}`,
    difficulty,
    gameMechanicsByTier: WORD_TILE_AGENT_STRATEGY_BY_TIER,
  });
}

/** Difficulty block (game tip + generic tier intent) — Word Tile has no per-tier tip. */
export function agentDifficultyBlock(difficulty: Difficulty): string {
  return agentDifficultyLine(difficulty);
}

/** How Word Tile grades a model attempt, for the kit evaluator. */
export const WORD_TILE_AGENT_EVALUATION = {
  structuralToolId: TOOL_ID,
  parseMove: gradeAgentMove,
  preflight: preflightAgentMove,
  classifyError: (error: unknown) =>
    error instanceof z.ZodError ? 'structural' : 'game_rule',
} as const;

export const WORD_TILE_AGENT_PURPOSE = PURPOSE;
export const WORD_TILE_STRUCTURAL_TOOL_ID = TOOL_ID;

// ---------------------------------------------------------------------------
// Agent turn: user prompt, move parsing, retry hints
// ---------------------------------------------------------------------------

function countOccupiedCells(state: TileWordGridState): number {
  let n = 0;
  for (const row of state.board) {
    for (const cell of row) {
      if (cell != null) {
        n += 1;
      }
    }
  }
  return n;
}

/** Derived from state only â€” tells the model opening vs continuing the same match. */
function buildMatchPhaseLine(state: TileWordGridState): string {
  if (state.firstMove) {
    return `Match phase: opening turn (no tiles on board yet). Place through center (${CENTER_ROW},${CENTER_COL}).`;
  }
  const tiles = countOccupiedCells(state);
  if (tiles <= 12) {
    return `Match phase: early â€” ${tiles} tile(s) on board; this is your next turn in the same match.`;
  }
  if (tiles <= 48) {
    return `Match phase: mid-game â€” ${tiles} tiles on board; continue from the position below.`;
  }
  return `Match phase: late â€” ${tiles} tiles on board; play the best move from the current position.`;
}

export function buildUserPrompt(
  state: TileWordGridState,
  playerSeat: number,
  difficulty: Difficulty,
  retry?: { lastRejection: string; attempt: number },
): string {
  const rack = (state.racks[playerSeat] ?? []).join('');
  const you = state.scores[playerSeat] ?? 0;
  const opp = state.scores[playerSeat === 1 ? 2 : 1] ?? 0;
  return [
    formatDifficultyUserLine(difficulty, WORD_TILE_GAME_IDS.TILE_WORD_GRID),
    buildMatchPhaseLine(state),
    `You are player seat ${playerSeat}.`,
    `Scores â€” you: ${you}, opponent: ${opp}`,
    `Opening-turn flag (center required): ${state.firstMove}`,
    `Tiles in bag: ${state.bag.length}`,
    `Your rack: ${rack || '(empty)'}`,
    '',
    'Board (ASCII â€” row label at left, column numbers on top; Â· = center star if empty, . = empty):',
    formatBoardAscii(state.board, CENTER_ROW, CENTER_COL),
    '',
    `Empty cells adjacent to tiles (edge-connected anchors): ${formatAdjacentEmptyAnchors(state.board)}`,
    `Board occupied list: ${formatBoardOccupiedList(state.board)}`,
    `Center: row ${CENTER_ROW}, col ${CENTER_COL}`,
    `Consecutive passes (both players): ${state.passesInRow}`,
    '',
    `Call tool ${TOOL_ID} with your move (no prose in assistant content).`,
    'For each anchor, consider hooks: often only 1â€“2 rack tiles on empty cells; letters already on the board complete the word (do not re-place them).',
    'Validate every straight line through each new tile (horizontal and vertical) for valid English words.',
    ...(retry
      ? [`Last rejection: ${retry.lastRejection}`, 'Do not repeat that placement or invalid word.']
      : []),
    ...(difficulty === 'medium' || difficulty === 'hard' || difficulty === 'boss'
      ? ['', WORD_TILE_USER_TURN_CHECKLIST[difficulty]!]
      : []),
    ...((): string[] => {
      const hintBlock = formatWordTileAgentLegalHints(state, playerSeat, difficulty, {
        maxPlays:
          retry && retry.attempt >= 2
            ? difficulty === 'medium'
              ? 4
              : 5
            : undefined,
        emphasizePass: Boolean(retry && retry.attempt >= 3),
      });
      return hintBlock ? ['', hintBlock] : [];
    })(),
  ].join('\n');
}

function formatAgentMoveSchemaError(error: z.ZodError): string {
  for (const issue of error.issues) {
    if (issue.path.includes('letter')) {
      return 'Each placement must include "letter" (one Aâ€“Z tile from your rack).';
    }
    if (issue.path.includes('row') || issue.path.includes('col')) {
      return 'Placement row and col must be integers from 0 to 14.';
    }
  }
  return 'Move JSON did not match the required schema.';
}

function normalizeMove(parsed: z.infer<typeof AgentMoveSchema>): ResolvedAgentMove {
  if (parsed.type === 'place') {
    const placements = (parsed.placements ?? []).map((p) => ({
      row: p.row,
      col: p.col,
      letter: p.letter.toUpperCase(),
    }));
    return { type: 'place', placements };
  }
  if (parsed.type === 'exchange') {
    return {
      type: 'exchange',
      letters: (parsed.letters ?? []).map((l) => l.toUpperCase()),
    };
  }
  if (parsed.type === 'resign') {
    return { type: 'resign' };
  }
  return { type: 'pass' };
}

function parseAndValidateAgentMove(
  raw: unknown,
  state: TileWordGridState,
  playerSeat: number,
): ResolvedAgentMove {
  let parsed: z.infer<typeof AgentMoveSchema>;
  try {
    parsed = AgentMoveSchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new Error(formatAgentMoveSchemaError(e));
    }
    throw e;
  }
  const move = normalizeMove(parsed);
  if (move.type === 'pass') {
    if (state.firstMove) {
      throw new Error('Cannot pass on the first turn â€” place a word through the center.');
    }
    return move;
  }
  if (move.type === 'exchange') {
    const v = validateExchange(state, move.letters, playerSeat);
    if (!v.ok) {
      throw new Error(v.error ?? 'invalid exchange');
    }
    return move;
  }
  if (move.type === 'place') {
    const v = validatePlace(state, move.placements, playerSeat);
    if (!v.ok) {
      throw new Error(v.error ?? 'invalid placement');
    }
    return move;
  }
  return move;
}

function formatTurnAttemptsRemainingLine(attemptsRemaining: number): string {
  if (attemptsRemaining <= 0) {
    return 'No further tries this turn â€” the server will pass for you.';
  }
  if (attemptsRemaining === 1) {
    return 'You have one more try this turn; after that the server passes for you.';
  }
  return `You have ${attemptsRemaining} more tries this turn; after that the server passes for you.`;
}

function formatExchangeStumpHint(exchangeAvailable: boolean): string {
  if (!exchangeAvailable) {
    return ' If you cannot find a valid word, {"type":"pass"} is allowed (when not opening).';
  }
  return (
    ' You may {"type":"exchange","letters":["A","B",...]} to swap rack tiles when the bag has tiles â€” ' +
    'exchange does NOT use one of your limited rejected-placement tries this turn; prefer exchange over passing when stuck on letters.'
  );
}

/** Same board cells, different letters — counts repeat shapes among prior turns. */
function placementShapeRepeatCount(
  turns: readonly PlatformLlmToolFeedbackTurn[],
  argumentsJson: string | undefined,
): number {
  const shape = argumentsJson ? shapeKey(argumentsJson) : null;
  return shape ? turns.filter((t) => shapeKey(t.arguments) === shape).length : 0;
}

/** Dictionary words already rejected this turn, from the recorded tool results. */
function collectRejectedInvalidWords(
  turns: readonly PlatformLlmToolFeedbackTurn[],
): string[] {
  const words: string[] = [];
  for (const turn of turns) {
    try {
      const body = JSON.parse(turn.resultContent) as { error?: string };
      const match = body.error?.match(/^Unknown word:? ?([A-Z]+)/);
      if (match?.[1]) {
        words.push(match[1]);
      }
    } catch {
      /* not a structured rejection */
    }
  }
  return [...new Set(words)];
}

function attemptsRemainingAfterPlacementRejects(placementRejectCount: number): number {
  return Math.max(0, STUMPED_PASS_AFTER_ATTEMPTS - placementRejectCount);
}

function shapeKey(argumentsJson: string): string | null {
  try {
    const raw = JSON.parse(argumentsJson) as {
      type?: string;
      placements?: { row: number; col: number }[];
    };
    if (raw.type !== 'place' || !raw.placements?.length) {
      return null;
    }
    return raw.placements
      .map((p) => `${p.row},${p.col}`)
      .sort()
      .join('|');
  } catch {
    return null;
  }
}

function rackWordRepeatCount(
  turns: readonly PlatformLlmToolFeedbackTurn[],
  argumentsJson: string | undefined,
): number {
  const word = argumentsJson ? rackTilesWordFromPlaceToolArguments(argumentsJson) : null;
  return word
    ? turns.filter((t) => rackTilesWordFromPlaceToolArguments(t.arguments) === word).length
    : 0;
}

/**
 * End the turn when the model is cycling rather than converging.
 *
 * This is the game's own stuck-detection, distinct from the kit's structural
 * round cap: these rejections are all *legal-looking* moves that fail Word Tile's
 * rules, so the loop would otherwise keep nudging forever.
 */
export function agentAbortReason(
  priorTurns: readonly PlatformLlmToolFeedbackTurn[],
): string | null {
  const placementRejects = placementRejectCountForStumpTurn(priorTurns);
  if (placementRejects >= STUMPED_PASS_AFTER_ATTEMPTS) {
    return `Rejected ${placementRejects} placements this turn.`;
  }
  const lastArgs = priorTurns[priorTurns.length - 1]?.arguments;
  if (placementShapeRepeatCount(priorTurns, lastArgs) >= SHAPE_CYCLE_THRESHOLD + 1) {
    return 'The same cells were attempted repeatedly with different letters.';
  }
  if (rackWordRepeatCount(priorTurns, lastArgs) >= RACK_WORD_REPEAT_THRESHOLD) {
    return 'The same rack tiles were attempted repeatedly.';
  }
  return null;
}

/** Failed `place` attempts this turn (exchange/pass/resign excluded). */
export function placementRejectCountForStumpTurn(
  turns: readonly PlatformLlmToolFeedbackTurn[],
): number {
  return turns.filter((t) => {
    try {
      return (JSON.parse(t.arguments) as { type?: string }).type === 'place';
    } catch {
      return false;
    }
  }).length;
}

/** Structural pre-check: `place` must not also carry an exchange `letters` field. */
export function preflightAgentMove(raw: unknown): string | null {
  if (
    typeof raw === 'object' &&
    raw != null &&
    (raw as { type?: string }).type === 'place' &&
    Array.isArray((raw as { letters?: unknown }).letters) &&
    (raw as { letters: unknown[] }).letters.length > 0
  ) {
    return 'type "place" must use placements[] only — remove the letters field (letters is for exchange).';
  }
  return null;
}

/** Model-facing hint for a rejected attempt. */
export function agentToolResultHint(error: string): string | undefined {
  if (error === 'Tiles must lie on one row or column') {
    return 'Every placement must share the same row OR the same column (straight line). Do not mix rows and columns (no L-shapes). List only new tiles from your rack.';
  }
  if (error === 'Cell occupied') {
    return 'That square already has a tile — omit it from placements[]. Use only empty cells; existing board letters still count toward the word.';
  }
  if (error === 'Tiles must form one continuous word') {
    return 'Along the line you play, there cannot be empty gaps between new tiles and existing tiles — fill a contiguous run.';
  }
  if (error.startsWith('Unknown word')) {
    return 'Not a valid dictionary word (including cross-words through your new tiles). Try a different valid placement. Board and rack are unchanged.';
  }
  return undefined;
}

/** Grade a tool payload: parse, then rules-validate. Throws the model-facing reason. */
export function gradeAgentMove(
  raw: unknown,
  state: TileWordGridState,
  playerSeat: number,
): ResolvedAgentMove {
  return parseAndValidateAgentMove(raw, state, playerSeat);
}

/** Does this rejection consume Word Tile's per-turn placement budget? */
export function countsAsPlacementStumpReject(
  toolArguments: string,
  retryKind: 'structural' | 'game_rule',
): boolean {
  if (retryKind !== 'game_rule' || !toolArguments) {
    return false;
  }
  try {
    return (JSON.parse(toolArguments) as { type?: string }).type === 'place';
  } catch {
    return false;
  }
}

export function buildAgentRetryUserHint(context: AgentLoopRetryContext<TileWordGridState>): string {
  const { priorTurns, attempt, state, playerSeat, difficulty } = context;
  const lastArgs = priorTurns[priorTurns.length - 1]?.arguments;
  const duplicateAttempts =
    lastArgs != null ? priorTurns.filter((t) => t.arguments === lastArgs).length : 0;
  const shapeRepeats = placementShapeRepeatCount(priorTurns, lastArgs);
  const rejectedWords = collectRejectedInvalidWords(priorTurns);

  const parts = [
    attempt > 1
      ? `The server rejected your last tool call (see ${priorTurns.length} prior tool result(s) above).`
      : 'The server rejected your tool call.',
  ];
  if (rejectedWords.length > 0) {
    parts.push(`Invalid words already tried: ${rejectedWords.join(', ')}.`);
  }
  if (shapeRepeats >= SHAPE_CYCLE_THRESHOLD) {
    parts.push(
      'You keep playing the same cells with different letters â€” change which squares you use, play elsewhere, or {"type":"pass"} / exchange.',
    );
  }
  const lastRackWord = lastArgs ? rackTilesWordFromPlaceToolArguments(lastArgs) : null;
  const sameRackWordAttempts =
    lastRackWord != null ? rackWordRepeatCount(priorTurns, lastArgs) : 0;
  if (lastRackWord && sameRackWordAttempts >= 2) {
    parts.push(
      `You already tried placing rack tiles "${lastRackWord}" ${sameRackWordAttempts + 1} times with different coordinates â€” pick another word, {"type":"pass"}, or exchange.`,
    );
  }
  const placementRejects = placementRejectCountForStumpTurn(priorTurns);
  const attemptsRemaining = attemptsRemainingAfterPlacementRejects(placementRejects);
  if (rejectedWords.length > 0) {
    parts.push(formatTurnAttemptsRemainingLine(attemptsRemaining));
    parts.push(
      'Pick a different valid English word/placement.' +
        formatExchangeStumpHint(context.state.bag.length > 0),
    );
  } else if (attemptsRemaining === 1) {
    parts.push(
      'One more try this turn â€” submit a legal move, or {"type":"pass"} / {"type":"exchange"} if you cannot.',
    );
  } else if (attemptsRemaining > 0 && attemptsRemaining <= 3) {
    parts.push(formatTurnAttemptsRemainingLine(attemptsRemaining));
  }
  if (duplicateAttempts >= 2) {
    parts.push('You already submitted this exact move â€” change placements or move type.');
  }
  const shouldInjectLegalHints =
    attempt >= 2 ||
    shapeRepeats >= 1 ||
    placementRejects >= 2 ||
    (difficulty === 'medium' && placementRejects >= 1);
  if (shouldInjectLegalHints) {
    const legalHints = formatWordTileAgentLegalHints(
      state,
      playerSeat,
      difficulty as Difficulty,
      {
        maxPlays: difficulty === 'medium' ? 4 : 5,
        emphasizePass: shapeRepeats >= 1 || placementRejects >= 4,
      },
    );
    if (legalHints) {
      parts.push(legalHints);
    }
  }
  parts.push('Use the board and rack from the first user message.');
  return parts.join(' ');
}
