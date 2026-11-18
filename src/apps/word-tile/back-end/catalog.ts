import type { GameCatalogEntry } from '../shared/types';
import { WORD_TILE_GAME_IDS } from '../shared/types';

export const WORD_TILE_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: WORD_TILE_GAME_IDS.TILE_WORD_GRID,
    name: 'Word tile',
    description: 'Place letter tiles on a shared board — vs AI or a friend.',
    faIcon: 'fa-table-cells-large',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
