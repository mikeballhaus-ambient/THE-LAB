/** Shared street helpers (UI + rules). */

export function canDealNextStreetBoard(boardLength: number, completed: boolean): boolean {
  if (completed) {
    return false;
  }
  return boardLength === 0 || boardLength === 3 || boardLength === 4;
}

export function nextStreetName(boardLength: number): 'flop' | 'turn' | 'river' | null {
  if (boardLength === 0) {
    return 'flop';
  }
  if (boardLength === 3) {
    return 'turn';
  }
  if (boardLength === 4) {
    return 'river';
  }
  return null;
}
