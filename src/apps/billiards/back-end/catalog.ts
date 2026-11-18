import type { GameCatalogEntry } from '@/shared/game-platform/types';

export const BILLIARDS_GAME_IDS = {
  PRACTICE: 'billiards-practice',
  EIGHT_BALL: 'billiards',
} as const;

export const BILLIARDS_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: BILLIARDS_GAME_IDS.PRACTICE,
    name: 'Practice table',
    description: 'Rack or place balls — solo drills and shot practice.',
    faIcon: 'fa-circle',
    order: 1,
    playerMode: 'solo',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'none',
  },
  {
    id: BILLIARDS_GAME_IDS.EIGHT_BALL,
    name: '8-Ball',
    description: 'Eight-ball — vs Lab Assistant or invite a friend.',
    faIcon: 'fa-circle',
    order: 2,
    playerMode: 'multiplayer',
    matchArchetype: 'turn-based',
    scoreKind: 'points-higher',
    agentMode: 'llm',
  },
];
