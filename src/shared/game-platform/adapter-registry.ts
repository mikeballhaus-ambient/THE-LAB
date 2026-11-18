/**
 * Process-global registry of game rules adapters.
 *
 * Each hybrid game app registers its adapter(s) once at server boot:
 *   registerGameAdapters([ticTacToeAdapter])
 *
 * The kit's match service resolves adapters by `gameId`. Kept deliberately
 * free of `src/apps/**` imports (decoupling rule).
 */
import type { GameServerAdapter } from './types';

const adapters = new Map<string, GameServerAdapter>();

export function registerGameAdapter(adapter: GameServerAdapter): void {
  adapters.set(adapter.gameId, adapter);
}

export function registerGameAdapters(list: readonly GameServerAdapter[]): void {
  for (const adapter of list) {
    registerGameAdapter(adapter);
  }
}

export function getGameAdapter(gameId: string): GameServerAdapter | null {
  return adapters.get(gameId) ?? null;
}

export function listGameAdapters(): GameServerAdapter[] {
  return [...adapters.values()];
}

/** Test-only: clear the registry between cases. */
export function resetGameAdapters(): void {
  adapters.clear();
}
