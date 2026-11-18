/**
 * Shared turn-based game platform kit — client-safe barrel.
 *
 * Only type + pure + browser composables live here so front-end bundles never
 * pull Node-only code (better-sqlite3, node:crypto, platform LLM client). Server
 * modules are re-exported from `./server`.
 *
 * See [plans/rm-53-games/SHARED-GAME-PLATFORM.md] for the design contract.
 */
export * from './types';
export * from './adapter-registry';
export * from './create-adapter';
export * from './client-socket';
export * from './use-turn-based-match';
export * from './use-game-invites';
