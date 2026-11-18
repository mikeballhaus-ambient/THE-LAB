import { onScopeDispose, shallowRef } from 'vue';
import type { Socket } from 'socket.io-client';
import { LAB_EVENTS_SOCKET } from '@/shared/types/lab-events-socket-events';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { buildLabCommsSocketAuth } from '@/shared/composables/useLabComms';
import { connectLabEventsSocket } from '@/shared/composables/useLabNotifications';

/**
 * Subscribe to `/lab-events` ledger journal refresh signals while a composable scope is active
 * (Settings Financial ledger panel or `app-lab-financial-ledger` Journal tab).
 */
export function useLabLedgerJournalLive(onRefresh: () => void | Promise<void>): void {
  const socket = shallowRef<Socket | null>(null);

  function connect(): void {
    if (socket.value?.connected) {
      return;
    }
    const sock = connectLabEventsSocket(resolvePlatformBackendUrlForClient());
    sock.on('connect', () => {
      sock.emit(LAB_EVENTS_SOCKET.SUBSCRIBE);
    });
    sock.on(LAB_EVENTS_SOCKET.LEDGER_JOURNAL_CHANGED, () => {
      void onRefresh();
    });
    sock.auth = buildLabCommsSocketAuth();
    sock.connect();
    socket.value = sock;
  }

  function disconnect(): void {
    if (socket.value) {
      socket.value.removeAllListeners();
      socket.value.disconnect();
      socket.value = null;
    }
  }

  connect();

  onScopeDispose(() => {
    disconnect();
  });
}
