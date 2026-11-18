import type { GameCatalogEntry } from '@/shared/game-platform/types';

export const POKER_GAME_IDS = {
  POKER_HOLDEM: 'poker-holdem',
} as const;

export type PokerGameId = (typeof POKER_GAME_IDS)[keyof typeof POKER_GAME_IDS];

export const POKER_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: POKER_GAME_IDS.POKER_HOLDEM,
    name: "Texas Hold'em",
    description: 'Heads-up Hold\u2019em — play money only.',
    faIcon: 'fa-heart',
    order: 1,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
