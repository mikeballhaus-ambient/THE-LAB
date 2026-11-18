import { shallowRef } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { getLabAccessToken } from '@/shared/composables/useLabPlatformAuth';

const ACK_TIMEOUT_MS = 20_000;

function buildAuth(): Record<string, string> {
  const accessToken = getLabAccessToken();
  return accessToken ? { accessToken } : {};
}

/**
 * Minimal Socket.IO client for dashboard → hybrid game app (invite accept/decline).
 * Event names come from {@link GAME_APP_INVITE_REGISTRY}, not from app composables.
 */
export function useGameAppSocketAck() {
  const connected = shallowRef(false);
  let socketInstance: Socket | null = null;
  let connectedUrl = '';

  function connect(serverUrl: string): Socket {
    const base = serverUrl.replace(/\/$/, '');
    if (!base) {
      throw new Error('Game app server URL is required');
    }
    if (socketInstance && connectedUrl === base) {
      return socketInstance;
    }
    socketInstance?.removeAllListeners();
    socketInstance?.disconnect();
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
    return sock;
  }

  async function emitAck<TData>(
    event: string,
    payload: Record<string, unknown> = {},
  ): Promise<TData> {
    if (!socketInstance) {
      throw new Error('Game app socket not connected');
    }
    const sock = socketInstance;
    if (!sock.connected) {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Socket connect timeout')), ACK_TIMEOUT_MS);
        sock.once('connect', () => {
          window.clearTimeout(timer);
          resolve();
        });
        sock.once('connect_error', (err) => {
          window.clearTimeout(timer);
          reject(err);
        });
      });
    }
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error(`Socket request timed out (${event})`));
      }, ACK_TIMEOUT_MS);
      sock.emit(event, payload, (res: { success?: boolean; data?: TData; error?: string }) => {
        window.clearTimeout(timer);
        if (res?.success) {
          resolve(res.data as TData);
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
    connected.value = false;
  }

  return { connected, connect, emitAck, dispose };
}
