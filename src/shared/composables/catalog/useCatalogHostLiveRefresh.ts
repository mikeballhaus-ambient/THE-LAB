import { onMounted, onUnmounted, type Ref } from 'vue';
import { io, type Socket } from 'socket.io-client';
import {
  CATALOG_HOST_SOCKET_EVENTS,
  type CatalogHostDataChangedPayload,
} from '@/shared/types/catalog-host-socket-events';

export interface UseCatalogHostLiveRefreshOptions {
  hostAppId: string;
  serverUrl: Ref<string> | (() => string);
  /** Reload lists, summaries, charts (`dataRevision`), etc. */
  onRefresh: (payload: CatalogHostDataChangedPayload) => void | Promise<void>;
  /** When false, skip connecting (e.g. serverUrl empty). Default true. */
  enabled?: Ref<boolean> | (() => boolean);
}

function resolveRef<T>(value: Ref<T> | (() => T)): T {
  return typeof value === 'function' ? (value as () => T)() : value.value;
}

/**
 * Subscribe to the catalog host app's Socket.IO `catalog-host:data-changed` event.
 * Use in every catalog workspace `App.vue` so workflow write-backs and peer clients stay in sync.
 */
export function useCatalogHostLiveRefresh(options: UseCatalogHostLiveRefreshOptions): void {
  let socket: Socket | null = null;

  onMounted(() => {
    const enabled = options.enabled ? resolveRef(options.enabled) : true;
    const base = resolveRef(options.serverUrl).replace(/\/$/, '');
    if (!enabled || !base) {
      return;
    }

    socket = io(base, { transports: ['websocket', 'polling'] });
    socket.on(CATALOG_HOST_SOCKET_EVENTS.DATA_CHANGED, (payload: CatalogHostDataChangedPayload) => {
      if (payload?.hostAppId && payload.hostAppId !== options.hostAppId) {
        return;
      }
      void options.onRefresh(payload);
    });
  });

  onUnmounted(() => {
    socket?.disconnect();
    socket = null;
  });
}
