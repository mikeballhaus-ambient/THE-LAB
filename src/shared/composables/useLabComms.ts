import { onScopeDispose, ref, shallowRef, type Ref } from 'vue';
import { io, type Socket } from 'socket.io-client';
import {
  LAB_COMMS_EVENTS,
  type LabDmChannelSummary,
  type LabEnvelope,
  type LabPresenceStatus,
  type LabUnreadSummary,
  type UserPresenceState,
} from '@/shared/types';
import { dmChannelId } from '@/shared/types/schemas/lab-comms-schema';
import { getLabAccessToken, getLabSessionId } from '@/shared/composables/useLabPlatformAuth';
import { reduceUnreadSummary } from '@/shared/utils/lab-comms-ui';

const ACTIVITY_INTERVAL_MS = 2 * 60 * 1000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export function buildLabCommsSocketAuth(): Record<string, string | undefined> {
  const labSessionId = getLabSessionId();
  const accessToken = getLabAccessToken();
  return {
    labSessionId: labSessionId ?? undefined,
    accessToken: accessToken ?? undefined,
    sessionId: labSessionId ?? undefined,
  };
}

export function connectLabCommsSocket(baseUrl: string): Socket {
  const normalized = baseUrl.replace(/\/$/, '');
  return io(`${normalized}/lab-comms`, {
    withCredentials: true,
    autoConnect: false,
    auth: buildLabCommsSocketAuth(),
  });
}

export type LabCommsMatchStateMessage = {
  matchId: string;
  match: Record<string, unknown>;
};

export interface UseLabCommsOptions {
  serverUrl: string;
  isAuthenticated: Ref<boolean>;
  onCommsError?: (code: string, message: string) => void;
  /** Ephemeral Time Wasters PvP sync (`comms:match:state`). */
  onMatchState?: (payload: LabCommsMatchStateMessage) => void;
}

export function useLabComms(options: UseLabCommsOptions) {
  const { serverUrl, isAuthenticated, onCommsError, onMatchState } = options;

  const socket = shallowRef<Socket | null>(null);
  const connected = ref(false);
  const reconnecting = ref(false);
  const channels = ref<LabDmChannelSummary[]>([]);
  const messagesByChannelId = ref<Record<string, LabEnvelope[]>>({});
  const unreadTotal = ref(0);
  const unreadByPartnerId = ref<Record<number, number>>({});
  const presenceByUserId = ref<Record<number, UserPresenceState>>({});

  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let activityTimer: ReturnType<typeof setInterval> | null = null;
  let shouldStayConnected = false;

  function clearReconnectTimer(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function clearActivityTimer(): void {
    if (activityTimer) {
      clearInterval(activityTimer);
      activityTimer = null;
    }
  }

  function scheduleReconnect(): void {
    if (!shouldStayConnected || !isAuthenticated.value) {
      return;
    }
    reconnecting.value = true;
    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** reconnectAttempt,
    );
    reconnectAttempt += 1;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      connect();
    }, delay);
  }

  function applyUnread(summary: LabUnreadSummary): void {
    const next = reduceUnreadSummary(
      { total: unreadTotal.value, byPartnerId: unreadByPartnerId.value },
      summary,
    );
    unreadTotal.value = next.total;
    unreadByPartnerId.value = next.byPartnerId;
  }

  function upsertMessage(envelope: LabEnvelope): void {
    const list = messagesByChannelId.value[envelope.channelId] ?? [];
    if (list.some((m) => m.id === envelope.id)) {
      return;
    }
    messagesByChannelId.value = {
      ...messagesByChannelId.value,
      [envelope.channelId]: [...list, envelope],
    };
  }

  function attachSocketHandlers(sock: Socket): void {
    sock.on('connect', () => {
      connected.value = true;
      reconnecting.value = false;
      reconnectAttempt = 0;
      sock.emit(LAB_COMMS_EVENTS.CHANNELS_REQUEST);
    });

    sock.on('disconnect', () => {
      connected.value = false;
      scheduleReconnect();
    });

    sock.on('connect_error', () => {
      connected.value = false;
      scheduleReconnect();
    });

    sock.on(LAB_COMMS_EVENTS.MESSAGE, (envelope: LabEnvelope) => {
      upsertMessage(envelope);
      sock.emit(LAB_COMMS_EVENTS.CHANNELS_REQUEST);
    });

    sock.on(LAB_COMMS_EVENTS.MATCH_STATE, (payload: LabCommsMatchStateMessage) => {
      if (payload?.matchId && payload.match) {
        onMatchState?.(payload);
      }
    });

    sock.on(LAB_COMMS_EVENTS.HISTORY_RESPONSE, (payload: {
      channelId: string;
      messages: LabEnvelope[];
    }) => {
      messagesByChannelId.value = {
        ...messagesByChannelId.value,
        [payload.channelId]: payload.messages ?? [],
      };
    });

    sock.on(LAB_COMMS_EVENTS.CHANNELS_RESPONSE, (payload: {
      channels: LabDmChannelSummary[];
    }) => {
      channels.value = payload.channels ?? [];
    });

    sock.on(LAB_COMMS_EVENTS.UNREAD_SUMMARY, (summary: LabUnreadSummary) => {
      applyUnread(summary);
    });

    sock.on(LAB_COMMS_EVENTS.PRESENCE_SNAPSHOT, (states: UserPresenceState[]) => {
      const map: Record<number, UserPresenceState> = {};
      for (const state of states ?? []) {
        map[state.userId] = state;
      }
      presenceByUserId.value = map;
    });

    sock.on(LAB_COMMS_EVENTS.PRESENCE_UPDATE, (state: UserPresenceState) => {
      presenceByUserId.value = {
        ...presenceByUserId.value,
        [state.userId]: state,
      };
    });

    sock.on(LAB_COMMS_EVENTS.ERROR, (err: { code?: string; message?: string }) => {
      const code = err?.code ?? 'ERROR';
      const message = err?.message ?? 'Messaging error';
      onCommsError?.(code, message);
    });
  }

  function startActivityHeartbeat(): void {
    clearActivityTimer();
    activityTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && socket.value?.connected) {
        socket.value.emit(LAB_COMMS_EVENTS.ACTIVITY);
      }
    }, ACTIVITY_INTERVAL_MS);
  }

  function connect(): void {
    if (!isAuthenticated.value) {
      return;
    }
    shouldStayConnected = true;
    if (!socket.value) {
      const sock = connectLabCommsSocket(serverUrl);
      attachSocketHandlers(sock);
      socket.value = sock;
      startActivityHeartbeat();
    }
    socket.value.auth = buildLabCommsSocketAuth();
    if (!socket.value.connected) {
      reconnecting.value = true;
      socket.value.connect();
    }
  }

  function disconnect(): void {
    shouldStayConnected = false;
    clearReconnectTimer();
    clearActivityTimer();
    reconnecting.value = false;
    reconnectAttempt = 0;
    if (socket.value) {
      socket.value.removeAllListeners();
      socket.value.disconnect();
      socket.value = null;
    }
    connected.value = false;
    channels.value = [];
    messagesByChannelId.value = {};
    unreadTotal.value = 0;
    unreadByPartnerId.value = {};
    presenceByUserId.value = {};
  }

  function sendDm(targetUserId: number, text: string): void {
    socket.value?.emit(LAB_COMMS_EVENTS.SEND, { targetUserId, text });
  }

  function sendEnvelope(
    targetUserId: number,
    type: string,
    payload: Record<string, unknown>,
  ): void {
    socket.value?.emit(LAB_COMMS_EVENTS.SEND_ENVELOPE, {
      targetUserId,
      type,
      payload,
    });
  }

  function requestHistory(channelId: string, limit = 50, before?: string): void {
    socket.value?.emit(LAB_COMMS_EVENTS.HISTORY_REQUEST, { channelId, limit, before });
  }

  function markRead(channelId: string): void {
    socket.value?.emit(LAB_COMMS_EVENTS.MARK_READ, { channelId });
  }

  function clearChannelHistory(channelId: string): Promise<void> {
    const sock = socket.value;
    if (!sock?.connected) {
      return Promise.reject(new Error('Not connected to messages'));
    }
    return new Promise((resolve, reject) => {
      const onResponse = (payload: { channelId?: string }) => {
        if (payload?.channelId !== channelId) {
          return;
        }
        cleanup();
        messagesByChannelId.value = {
          ...messagesByChannelId.value,
          [channelId]: [],
        };
        sock.emit(LAB_COMMS_EVENTS.CHANNELS_REQUEST);
        resolve();
      };
      const onError = (err: { code?: string; message?: string }) => {
        cleanup();
        reject(new Error(err?.message ?? 'Could not clear history'));
      };
      const cleanup = () => {
        sock.off(LAB_COMMS_EVENTS.CLEAR_HISTORY_RESPONSE, onResponse);
        sock.off(LAB_COMMS_EVENTS.ERROR, onError);
      };
      sock.on(LAB_COMMS_EVENTS.CLEAR_HISTORY_RESPONSE, onResponse);
      sock.on(LAB_COMMS_EVENTS.ERROR, onError);
      sock.emit(LAB_COMMS_EVENTS.CLEAR_HISTORY, { channelId });
    });
  }

  function subscribeChannels(channelIds: string[]): void {
    if (!channelIds.length) {
      return;
    }
    socket.value?.emit(LAB_COMMS_EVENTS.SUBSCRIBE, { channelIds });
  }

  function requestChannels(): void {
    socket.value?.emit(LAB_COMMS_EVENTS.CHANNELS_REQUEST);
  }

  function presenceForUser(userId: number): LabPresenceStatus {
    return presenceByUserId.value[userId]?.status ?? 'red';
  }

  function channelIdForPartner(selfUserId: number, partnerUserId: number): string {
    return dmChannelId(selfUserId, partnerUserId);
  }

  onScopeDispose(() => {
    disconnect();
  });

  return {
    socket,
    connected,
    reconnecting,
    channels,
    messagesByChannelId,
    unreadTotal,
    unreadByPartnerId,
    presenceByUserId,
    connect,
    disconnect,
    sendDm,
    sendEnvelope,
    requestHistory,
    markRead,
    clearChannelHistory,
    subscribeChannels,
    requestChannels,
    presenceForUser,
    channelIdForPartner,
  };
}
