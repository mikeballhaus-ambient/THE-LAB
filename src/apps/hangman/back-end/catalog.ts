import type { GameCatalogEntry } from '@/shared/game-platform/types';

/** Game ids shipped by this app. */
export const HANGMAN_GAME_IDS = {
  HANGMAN: 'hangman',
} as const;

export type HangmanGameId = (typeof HANGMAN_GAME_IDS)[keyof typeof HANGMAN_GAME_IDS];

/** Catalog entries consumed by `GameRunsService` / the kit lobby. */
export const HANGMAN_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: HANGMAN_GAME_IDS.HANGMAN,
    name: 'Hangman',
    description: 'Guess the word — vs AI or a friend.',
    faIcon: 'fa-user-secret',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
