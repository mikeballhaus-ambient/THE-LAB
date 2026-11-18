/**
 * Generic Socket.IO client factory for a catalog game app server.
 *
 * Replaces Word Tile's `useWordTileSocket.ts`. One module-level socket per
 * app slug, lazily (re)connected to the app server URL.
 */
import { shallowRef } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { getLabAccessToken } from '@/shared/composables/useLabPlatformAuth';
import type { GamePlatformConfig } from './types';

const ACK_TIMEOUT_MS = 20_000;

export class GameSocketError extends Error {}

const instances = new Map<string, { socket: Socket; url: string; ready: Promise<void> | null }>();

function buildAuth(): Record<string, string> {
  const accessToken = getLabAccessToken();
  return accessToken ? { accessToken } : {};
}

function beginReady(sock: Socket): Promise<void> {
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

export function useGameSocket(config: Pick<GamePlatformConfig, 'appSlug'>) {
  const connected = shallowRef(false);
  const key = config.appSlug;

  function connect(serverUrl: string): Socket {
    const base = serverUrl.replace(/\/$/, '');
    if (!base) {
      throw new GameSocketError('Game app server URL is required');
    }
    const existing = instances.get(key);
    if (existing && existing.url === base) {
      return existing.socket;
    }
    existing?.socket.removeAllListeners();
    existing?.socket.disconnect();

    const sock = io(base, { withCredentials: true, autoConnect: true, auth: buildAuth() });
    sock.on('connect', () => {
      connected.value = true;
      sock.auth = buildAuth();
    });
    sock.on('disconnect', () => {
      connected.value = false;
    });
    instances.set(key, { socket: sock, url: base, ready: beginReady(sock) });
    return sock;
  }

  function getSocket(): Socket {
    const existing = instances.get(key);
    if (!existing) {
      throw new GameSocketError('Game socket not connected — call connect(serverUrl) first');
    }
    return existing.socket;
  }

  async function ensureConnected(): Promise<void> {
    const existing = instances.get(key);
    if (!existing) {
      throw new GameSocketError('Game socket not connected — call connect(serverUrl) first');
    }
    if (existing.socket.connected) {
      return;
    }
    if (!existing.ready) {
      existing.ready = beginReady(existing.socket);
    }
    await existing.ready;
  }

  async function emitAck<T = unknown>(event: string, payload?: unknown): Promise<T> {
    await ensureConnected();
    const sock = getSocket();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new GameSocketError(`${event} timed out`)), ACK_TIMEOUT_MS);
      sock.emit(event, payload, (res: { success: boolean; data?: T; error?: string }) => {
        clearTimeout(timer);
        if (res?.success) {
          resolve(res.data as T);
        } else {
          reject(new GameSocketError(res?.error ?? `${event} failed`));
        }
      });
    });
  }

  return { connected, connect, getSocket, ensureConnected, emitAck };
}
