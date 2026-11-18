/**
 * Shared turn-based game platform kit — server (Node-only) barrel.
 *
 * App back-end servers import from `@/shared/game-platform/server`. Do **not**
 * import this from front-end code (pulls better-sqlite3 / platform LLM client).
 */
export * from './types';
export * from './adapter-registry';
export * from './create-adapter';
export * from './agent-loop';
export * from './difficulty-policy';
export * from './match-schema';
export * from './runs-service';
export * from './resolve-agent-move';
export * from './match-service';
export * from './agent-turn-sse';
export * from './socket-registrar';
export * from './http-routes';
