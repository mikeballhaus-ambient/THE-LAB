import type { GameCatalogEntry } from '@/shared/game-platform/types';

export const CHESS_GAME_IDS = {
  CHESS: 'chess',
} as const;

export type ChessGameId = (typeof CHESS_GAME_IDS)[keyof typeof CHESS_GAME_IDS];

export const CHESS_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: CHESS_GAME_IDS.CHESS,
    name: 'Chess',
    description: 'Full-rules chess — vs AI or a friend.',
    faIcon: 'fa-chess',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
