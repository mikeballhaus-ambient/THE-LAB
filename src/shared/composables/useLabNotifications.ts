import { onScopeDispose, ref, shallowRef, type Ref } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { LAB_EVENTS_SOCKET } from '@/shared/types/lab-events-socket-events';
import type { LabUserNotification } from '@/shared/types/lab-domain-event';
import { buildLabCommsSocketAuth } from '@/shared/composables/useLabComms';
import {
  deleteLabNotification,
  deleteLabNotifications,
  fetchLabNotifications,
  markLabNotificationRead,
} from '@/shared/services/platform-lab-events.client';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export function connectLabEventsSocket(baseUrl: string): Socket {
  const normalized = baseUrl.replace(/\/$/, '');
  return io(`${normalized}/lab-events`, {
    withCredentials: true,
    autoConnect: false,
    auth: buildLabCommsSocketAuth(),
  });
}

export interface UseLabNotificationsOptions {
  serverUrl: string;
  isAuthenticated: Ref<boolean>;
}

export function useLabNotifications(options: UseLabNotificationsOptions) {
  const { serverUrl, isAuthenticated } = options;

  const socket = shallowRef<Socket | null>(null);
  const connected = ref(false);
  const reconnecting = ref(false);
  const notifications = ref<LabUserNotification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const dialogVisible = ref(false);

  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let shouldStayConnected = false;

  function clearReconnectTimer(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect(): void {
    if (!shouldStayConnected || !isAuthenticated.value) {
      return;
    }
    reconnecting.value = true;
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** reconnectAttempt);
    reconnectAttempt += 1;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function upsertNotification(item: LabUserNotification): void {
    const idx = notifications.value.findIndex((n) => n.id === item.id);
    if (idx >= 0) {
      const next = [...notifications.value];
      next[idx] = item;
      notifications.value = next;
    } else {
      notifications.value = [item, ...notifications.value];
    }
  }

  function attachSocketHandlers(sock: Socket): void {
    sock.on('connect', () => {
      connected.value = true;
      reconnecting.value = false;
      reconnectAttempt = 0;
      sock.emit(LAB_EVENTS_SOCKET.SUBSCRIBE);
    });

    sock.on('disconnect', () => {
      connected.value = false;
      scheduleReconnect();
    });

    sock.on('connect_error', () => {
      connected.value = false;
      scheduleReconnect();
    });

    sock.on(LAB_EVENTS_SOCKET.NOTIFICATION, (payload: LabUserNotification) => {
      if (payload?.id) {
        upsertNotification(payload);
      }
    });

    sock.on(LAB_EVENTS_SOCKET.UNREAD_COUNT, (payload: { userId?: number; count?: number }) => {
      if (typeof payload?.count === 'number' && Number.isFinite(payload.count)) {
        unreadCount.value = payload.count;
      }
    });
  }

  async function refresh(): Promise<void> {
    if (!isAuthenticated.value) {
      notifications.value = [];
      unreadCount.value = 0;
      return;
    }
    loading.value = true;
    try {
      const data = await fetchLabNotifications();
      notifications.value = data.notifications ?? [];
      unreadCount.value = notifications.value.filter((n) => !n.readAt).length;
    } finally {
      loading.value = false;
    }
  }

  async function markRead(notificationId: string): Promise<void> {
    await markLabNotificationRead(notificationId);
    notifications.value = notifications.value.map((n) =>
      n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n,
    );
    unreadCount.value = Math.max(0, notifications.value.filter((n) => !n.readAt).length);
  }

  /**
   * Dismiss a notification.
   *
   * Removed locally only after the server call succeeds, so a failed delete does not make the row
   * vanish and reappear on the next refresh.
   */
  async function remove(notificationId: string): Promise<void> {
    await deleteLabNotification(notificationId);
    notifications.value = notifications.value.filter((n) => n.id !== notificationId);
    unreadCount.value = Math.max(0, notifications.value.filter((n) => !n.readAt).length);
  }

  /** Dismiss several at once. Removed locally only after the server confirms. */
  async function removeMany(notificationIds: readonly string[]): Promise<void> {
    if (notificationIds.length === 0) {
      return;
    }
    await deleteLabNotifications(notificationIds);
    const gone = new Set(notificationIds);
    notifications.value = notifications.value.filter((n) => !gone.has(n.id));
    unreadCount.value = Math.max(0, notifications.value.filter((n) => !n.readAt).length);
  }

  function openDialog(): void {
    dialogVisible.value = true;
    void refresh();
  }

  function closeDialog(): void {
    dialogVisible.value = false;
  }

  function connect(): void {
    if (!isAuthenticated.value) {
      return;
    }
    shouldStayConnected = true;
    if (!socket.value) {
      const sock = connectLabEventsSocket(serverUrl);
      attachSocketHandlers(sock);
      socket.value = sock;
    }
    socket.value.auth = buildLabCommsSocketAuth();
    if (!socket.value.connected) {
      reconnecting.value = true;
      socket.value.connect();
    }
    void refresh();
  }

  function disconnect(): void {
    shouldStayConnected = false;
    clearReconnectTimer();
    if (socket.value) {
      socket.value.removeAllListeners();
      socket.value.disconnect();
      socket.value = null;
    }
    connected.value = false;
    reconnecting.value = false;
    notifications.value = [];
    unreadCount.value = 0;
    dialogVisible.value = false;
  }

  onScopeDispose(() => {
    disconnect();
  });

  return {
    connected,
    reconnecting,
    notifications,
    unreadCount,
    loading,
    dialogVisible,
    refresh,
    markRead,
    remove,
    removeMany,
    openDialog,
    closeDialog,
    connect,
    disconnect,
  };
}
