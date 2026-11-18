import { onUnmounted } from 'vue';
import type { SocketEvent } from '@/apps/lab-formsbuilder/shared/types';
import { createWebSocketStore } from '@/apps/lab-formsbuilder/front-end/stores/websocketStore';

type SocketPayloadHandler = (data: unknown) => void;

export function useWebSocket(serverUrl: string = '/api') {
  const websocketStore = createWebSocketStore();

  // Event emission for parent components to listen (via store)
  function emitEvent(event: SocketEvent, data: unknown): void {
    const callbacks = websocketStore.eventHandlers.get(event);
    if (callbacks) {
      callbacks.forEach((cb: SocketPayloadHandler) => cb(data));
    }
  }

  // Register callback for specific events (via store)
  function on(event: SocketEvent, callback: SocketPayloadHandler): void {
    websocketStore.on(event, callback);
  }

  // Remove callback (via store)
  function off(event: SocketEvent, callback: SocketPayloadHandler): void {
    websocketStore.off(event, callback);
  }

  // Check connection status (via store)
  function isConnected(): boolean {
    return websocketStore.isConnected;
  }

  onUnmounted(() => {
    websocketStore.disconnect();
  });

  return {
    socket: websocketStore.socket,
    connected: websocketStore.isConnected,
    connect: () => websocketStore.connect(serverUrl),
    disconnect: () => websocketStore.disconnect(),
    emitEvent,
    on,
    off,
    isConnected,
  };
}
