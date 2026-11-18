import { ref, type Ref } from 'vue';
import { TW_SOCKET_EVENTS } from '../../shared/types/socket-events';
import type { HumanHeadToHeadStats, WordTileGameId } from '../../shared/types';
import { useWordTileSocket } from './useWordTileSocket';

export function useHumanHeadToHead(serverUrl: Ref<string | undefined>) {
  const stats = ref<HumanHeadToHeadStats | null>(null);
  const loading = ref(false);
  const twSocket = useWordTileSocket();

  async function load(gameId: WordTileGameId, opponentUserId: number): Promise<void> {
    const base = serverUrl.value?.replace(/\/$/, '');
    if (!base || opponentUserId <= 0) {
      stats.value = null;
      return;
    }
    loading.value = true;
    try {
      twSocket.connect(base);
      stats.value = await twSocket.emitAck<HumanHeadToHeadStats>(TW_SOCKET_EVENTS.H2H_GET, {
        gameId,
        opponentUserId,
      });
    } catch {
      stats.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { stats, loading, load };
}
