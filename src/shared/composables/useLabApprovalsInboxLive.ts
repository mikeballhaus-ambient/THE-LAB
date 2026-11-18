import { onScopeDispose, shallowRef } from 'vue';
import type { Socket } from 'socket.io-client';
import { LAB_EVENTS_SOCKET } from '@/shared/types/lab-events-socket-events';
import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { buildLabCommsSocketAuth } from '@/shared/composables/useLabComms';
import { connectLabEventsSocket } from '@/shared/composables/useLabNotifications';

/**
 * Subscribe to `/lab-events` approval inbox refresh signals while a composable scope is active
 * (Settings Approvals panel or `app-lab-approvals-policies`).
 */
export function useLabApprovalsInboxLive(onRefresh: () => void | Promise<void>): void {
  const socket = shallowRef<Socket | null>(null);

  function connect(): void {
    if (socket.value?.connected) {
      return;
    }
    const sock = connectLabEventsSocket(resolvePlatformBackendUrlForClient());
    sock.on('connect', () => {
      sock.emit(LAB_EVENTS_SOCKET.SUBSCRIBE);
    });
    sock.on(LAB_EVENTS_SOCKET.APPROVALS_INBOX_CHANGED, () => {
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
