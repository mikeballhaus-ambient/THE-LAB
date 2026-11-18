import type { GameCatalogEntry } from '@/shared/game-platform/types';

/** Game ids shipped by this app. */
export const TIC_TAC_TOE_GAME_IDS = {
  TIC_TAC_TOE: 'tic-tac-toe',
} as const;

export type TicTacToeGameId = (typeof TIC_TAC_TOE_GAME_IDS)[keyof typeof TIC_TAC_TOE_GAME_IDS];

/** Catalog entries consumed by `GameRunsService` / the kit lobby. */
export const TIC_TAC_TOE_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE,
    name: 'Tic-Tac-Toe',
    description: 'Three in a row — vs AI or a friend.',
    faIcon: 'fa-xmark',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
