import { shallowRef } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { getLabAccessToken } from '@/shared/composables/useLabPlatformAuth';
import { TW_SOCKET_EVENTS, type TwSocketAck } from '../../shared/types/socket-events';

const ACK_TIMEOUT_MS = 20_000;

let socketInstance: Socket | null = null;
let connectedUrl = '';
let connectReady: Promise<void> | null = null;

function buildAuth(): Record<string, string> {
  const accessToken = getLabAccessToken();
  return accessToken ? { accessToken } : {};
}

function beginConnectReady(sock: Socket): Promise<void> {
  if (sock.connected) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      sock.off('connect', onConnect);
      sock.off('connect_error', onError);
    };
    sock.on('connect', onConnect);
    sock.on('connect_error', onError);
  });
}

export function useWordTileSocket() {
  const connected = shallowRef(false);

  function connect(serverUrl: string): Socket {
    const base = serverUrl.replace(/\/$/, '');
    if (!base) {
      throw new Error('Time Wasters app server URL is required');
    }
    if (socketInstance && connectedUrl === base) {
      return socketInstance;
    }

    socketInstance?.removeAllListeners();
    socketInstance?.disconnect();
    connectReady = null;

    connectedUrl = base;
    const sock = io(base, {
      withCredentials: true,
      autoConnect: true,
      auth: buildAuth(),
    });
    sock.on('connect', () => {
      connected.value = true;
      sock.auth = buildAuth();
    });
    sock.on('disconnect', () => {
      connected.value = false;
    });
    socketInstance = sock;
    connectReady = beginConnectReady(sock);
    return sock;
  }

  function getSocket(): Socket {
    if (!socketInstance) {
      throw new Error('Time Wasters socket not connected — call connect(serverUrl) first');
    }
    return socketInstance;
  }

  async function ensureConnected(): Promise<void> {
    getSocket();
    if (socketInstance!.connected) {
      return;
    }
    if (!connectReady) {
      connectReady = beginConnectReady(socketInstance!);
    }
    await connectReady;
  }

  async function emitAck<TData>(
    event: string,
    payload: Record<string, unknown> | unknown[] = {},
  ): Promise<TData> {
    await ensureConnected();
    const sock = getSocket();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error(`Socket request timed out (${event})`));
      }, ACK_TIMEOUT_MS);
      sock.emit(event, payload, (res: TwSocketAck<TData>) => {
        window.clearTimeout(timer);
        if (res?.success) {
          resolve(res.data);
          return;
        }
        reject(new Error(res?.error ?? 'Socket request failed'));
      });
    });
  }

  function dispose(): void {
    socketInstance?.removeAllListeners();
    socketInstance?.disconnect();
    socketInstance = null;
    connectedUrl = '';
    connectReady = null;
    connected.value = false;
  }

  return {
    connected,
    connect,
    getSocket,
    ensureConnected,
    emitAck,
    dispose,
    events: TW_SOCKET_EVENTS,
  };
}
