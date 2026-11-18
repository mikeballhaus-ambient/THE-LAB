import type { GameCatalogEntry } from '@/shared/game-platform/types';

export const CONNECT_FOUR_GAME_IDS = {
  CONNECT_FOUR: 'connect-four',
} as const;

export type ConnectFourGameId =
  (typeof CONNECT_FOUR_GAME_IDS)[keyof typeof CONNECT_FOUR_GAME_IDS];

export const CONNECT_FOUR_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: CONNECT_FOUR_GAME_IDS.CONNECT_FOUR,
    name: 'Connect Four',
    description: 'Four in a row — vs AI or a friend.',
    faIcon: 'fa-circle',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
