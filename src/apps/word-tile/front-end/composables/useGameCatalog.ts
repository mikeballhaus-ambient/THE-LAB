import { ref, type Ref } from 'vue';
import { TW_SOCKET_EVENTS } from '../../shared/types/socket-events';
import type { GameCatalogEntry } from '../../shared/types';
import { useWordTileSocket } from './useWordTileSocket';

export function useGameCatalog(serverUrl: Ref<string | undefined>) {
  const games = ref<GameCatalogEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const twSocket = useWordTileSocket();

  async function refresh(): Promise<void> {
    const base = serverUrl.value?.replace(/\/$/, '');
    if (!base) {
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      twSocket.connect(base);
      const data = await twSocket.emitAck<{ games: GameCatalogEntry[] }>(
        TW_SOCKET_EVENTS.GAMES_LIST,
        {},
      );
      games.value = data.games ?? [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load games';
    } finally {
      loading.value = false;
    }
  }

  return { games, loading, error, refresh };
}
