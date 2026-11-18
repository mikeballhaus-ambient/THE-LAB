import type { GameCatalogEntry } from '@/shared/game-platform/types';

export const BATTLESHIP_GAME_IDS = {
  BATTLESHIP: 'battleship',
} as const;

export type BattleshipGameId = (typeof BATTLESHIP_GAME_IDS)[keyof typeof BATTLESHIP_GAME_IDS];

export const BATTLESHIP_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: BATTLESHIP_GAME_IDS.BATTLESHIP,
    name: 'Battleship',
    description: 'Hunt the fleet — vs AI or a friend.',
    faIcon: 'fa-ship',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
