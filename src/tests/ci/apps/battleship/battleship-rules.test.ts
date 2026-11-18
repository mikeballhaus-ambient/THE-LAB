import { describe, expect, test } from '@jest/globals';
import {
  coordKey,
  createFleet,
  fleetSunk,
  isShipCell,
  opponentSeat,
  shipsAfloat,
  shipSunk,
  visibleShotsForSeat,
  BS_SHIP_LENGTHS,
  BS_SIZE,
  type BsState,
} from '@/apps/battleship/back-end/rules';

describe('battleship rules', () => {
  test('every ship is 2â€“4 cells and stays in bounds with no overlaps', () => {
    const fleet = createFleet();
    expect(fleet.length).toBe(BS_SHIP_LENGTHS.length);
    const seen = new Set<string>();
    for (const ship of fleet) {
      expect(ship.cells.length).toBeGreaterThanOrEqual(2);
      expect(ship.cells.length).toBeLessThanOrEqual(4);
      for (const c of ship.cells) {
        expect(c.row).toBeGreaterThanOrEqual(0);
        expect(c.row).toBeLessThan(BS_SIZE);
        expect(c.col).toBeGreaterThanOrEqual(0);
        expect(c.col).toBeLessThan(BS_SIZE);
        const key = coordKey(c.row, c.col);
        expect(seen.has(key)).toBe(false); // no overlapping ships
        seen.add(key);
      }
    }
  });

  test('opponentSeat flips 1 <-> 2', () => {
    expect(opponentSeat(1)).toBe(2);
    expect(opponentSeat(2)).toBe(1);
  });

  test('shipSunk requires every cell hit; shipsAfloat counts survivors', () => {
    const ship = { id: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] };
    expect(shipSunk(ship, {})).toBe(false);
    expect(shipSunk(ship, { [coordKey(0, 0)]: 'hit' })).toBe(false);
    expect(shipSunk(ship, { [coordKey(0, 0)]: 'hit', [coordKey(0, 1)]: 'hit' })).toBe(true);
    // A miss on one cell doesn't sink it.
    expect(shipSunk(ship, { [coordKey(0, 0)]: 'hit', [coordKey(0, 1)]: 'miss' })).toBe(false);
    expect(shipsAfloat([ship], {})).toBe(1);
    expect(shipsAfloat([ship], { [coordKey(0, 0)]: 'hit', [coordKey(0, 1)]: 'hit' })).toBe(0);
  });

  test('fleetSunk is true only when every ship is fully hit', () => {
    const fleet = [
      { id: 0, cells: [{ row: 0, col: 0 }] },
      { id: 1, cells: [{ row: 1, col: 1 }, { row: 1, col: 2 }] },
    ];
    expect(fleetSunk(fleet, {})).toBe(false);
    expect(fleetSunk(fleet, { [coordKey(0, 0)]: 'hit' })).toBe(false);
    expect(
      fleetSunk(fleet, {
        [coordKey(0, 0)]: 'hit',
        [coordKey(1, 1)]: 'hit',
        [coordKey(1, 2)]: 'hit',
      }),
    ).toBe(true);
    expect(fleetSunk([], {})).toBe(false);
  });

  test('isShipCell finds a cell across multiple ships', () => {
    const fleet = [
      { id: 0, cells: [{ row: 3, col: 4 }, { row: 3, col: 5 }] },
    ];
    expect(isShipCell(fleet, 3, 5)).toBe(true);
    expect(isShipCell(fleet, 3, 6)).toBe(false);
  });

  test('visibleShotsForSeat splits own shots vs incoming', () => {
    const state: BsState = {
      fleets: { 1: [], 2: [] },
      shotsAt: {
        1: { [coordKey(1, 1)]: 'hit' },
        2: { [coordKey(0, 0)]: 'miss' },
      },
      turnHistory: [],
    };
    const view = visibleShotsForSeat(state, 1);
    expect(view.myShots[coordKey(1, 1)]).toBe('hit');
    expect(view.incomingShots[coordKey(0, 0)]).toBe('miss');
  });
});
