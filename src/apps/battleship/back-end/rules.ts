/**
 * Battleship rules — pure fleet placement and shot resolution.
 *
 * Two seats (1 and 2) each own a fleet. `shotsAt[seat]` holds the shots that
 * seat has fired; hits are resolved against the opponent's fleet. Fog of war is
 * enforced by {@link visibleShotsForSeat}, which never leaks the opponent's
 * un-hit ship positions.
 */

export const BS_SIZE = 8;

/** Classic small-fleet lengths (2–4 cells). */
export const BS_SHIP_LENGTHS: readonly number[] = [4, 3, 3, 2, 2];

export type BsSeat = 1 | 2;
export type BsShotResult = 'hit' | 'miss';

export interface BsCell {
  row: number;
  col: number;
}

export interface BsShip {
  id: number;
  cells: BsCell[];
}

/** `coordKey(row,col)` → result, per firing seat. */
export type BsShotMap = Record<string, BsShotResult>;

export interface BsState {
  fleets: Record<BsSeat, BsShip[]>;
  shotsAt: Record<BsSeat, BsShotMap>;
  turnHistory: BsSeat[];
}

export interface BsSeatView {
  /** Shots this seat fired, with hit/miss revealed. */
  myShots: BsShotMap;
  /** Shots the opponent fired at this seat. */
  incomingShots: BsShotMap;
}

/** Stable map key for a board coordinate. */
export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function opponentSeat(seat: BsSeat): BsSeat {
  return seat === 1 ? 2 : 1;
}

/** True when `row,col` belongs to any ship in the fleet. */
export function isShipCell(fleet: readonly BsShip[], row: number, col: number): boolean {
  return fleet.some((ship) => ship.cells.some((c) => c.row === row && c.col === col));
}

/** A ship is sunk only when every one of its cells registered a hit. */
export function shipSunk(ship: BsShip, shots: BsShotMap): boolean {
  return ship.cells.every((c) => shots[coordKey(c.row, c.col)] === 'hit');
}

export function shipsAfloat(fleet: readonly BsShip[], shots: BsShotMap): number {
  return fleet.filter((ship) => !shipSunk(ship, shots)).length;
}

/** An empty fleet is not "sunk" — there is nothing to have destroyed. */
export function fleetSunk(fleet: readonly BsShip[], shots: BsShotMap): boolean {
  return fleet.length > 0 && fleet.every((ship) => shipSunk(ship, shots));
}

/** Splits the shot maps so each seat sees only what it is entitled to. */
export function visibleShotsForSeat(state: BsState, seat: BsSeat): BsSeatView {
  return {
    myShots: { ...state.shotsAt[seat] },
    incomingShots: { ...state.shotsAt[opponentSeat(seat)] },
  };
}

function canPlace(
  occupied: Set<string>,
  row: number,
  col: number,
  length: number,
  horizontal: boolean,
): boolean {
  for (let i = 0; i < length; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r < 0 || r >= BS_SIZE || c < 0 || c >= BS_SIZE) return false;
    if (occupied.has(coordKey(r, c))) return false;
  }
  return true;
}

/**
 * Builds a fresh, non-overlapping, in-bounds fleet of {@link BS_SHIP_LENGTHS}.
 * Retries placement until the whole fleet fits; the board is large enough that
 * this terminates in practice.
 */
export function createFleet(random: () => number = Math.random): BsShip[] {
  const occupied = new Set<string>();
  const fleet: BsShip[] = [];

  BS_SHIP_LENGTHS.forEach((length, id) => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const horizontal = random() < 0.5;
      const row = Math.floor(random() * BS_SIZE);
      const col = Math.floor(random() * BS_SIZE);
      if (!canPlace(occupied, row, col, length, horizontal)) continue;

      const cells: BsCell[] = [];
      for (let i = 0; i < length; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        cells.push({ row: r, col: c });
        occupied.add(coordKey(r, c));
      }
      fleet.push({ id, cells });
      return;
    }
    // Extremely unlikely; keep the fleet length contract intact.
    fleet.push({ id, cells: [{ row: 0, col: id }] });
  });

  return fleet;
}
