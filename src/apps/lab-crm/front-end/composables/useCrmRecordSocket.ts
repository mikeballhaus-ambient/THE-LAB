import { onMounted, onUnmounted } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../shared/types';

export function useCrmRecordSocket(
  serverUrl: string,
  entityKey: string,
  onRefresh: () => void,
): void {
  let socket: Socket | null = null;

  onMounted(() => {
    if (!serverUrl) {
      return;
    }
    socket = io(serverUrl.replace(/\/$/, ''), { transports: ['websocket', 'polling'] });
    socket.on(SOCKET_EVENTS.ENTITY_RECORDS_CHANGED, (payload: { entityKey?: string }) => {
      if (!payload?.entityKey || payload.entityKey === entityKey) {
        onRefresh();
      }
    });
  });

  onUnmounted(() => {
    socket?.disconnect();
    socket = null;
  });
}
