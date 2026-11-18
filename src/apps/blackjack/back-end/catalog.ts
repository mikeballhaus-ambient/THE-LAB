import type { GameCatalogEntry } from '@/shared/game-platform/types';

export const BLACKJACK_GAME_IDS = {
  BLACKJACK: 'blackjack',
} as const;

export type BlackjackGameId = (typeof BLACKJACK_GAME_IDS)[keyof typeof BLACKJACK_GAME_IDS];

export const BLACKJACK_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: BLACKJACK_GAME_IDS.BLACKJACK,
    name: 'Blackjack',
    description: 'Beat the dealer — solo or heads-up vs a friend (Quarks).',
    faIcon: 'fa-heart',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
