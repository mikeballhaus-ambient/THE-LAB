import type { GameCatalogEntry } from '@/shared/game-platform/types';

export const CHECKERS_GAME_IDS = {
  CHECKERS: 'checkers',
} as const;

export type CheckersGameId = (typeof CHECKERS_GAME_IDS)[keyof typeof CHECKERS_GAME_IDS];

export const CHECKERS_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: CHECKERS_GAME_IDS.CHECKERS,
    name: 'Checkers',
    description: 'Draughts on an 8x8 board — vs AI or a friend.',
    faIcon: 'fa-chess-board',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
