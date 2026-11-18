import type { Ref } from 'vue';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, UserLoginEventData } from '@/shared/types';
import { setLabAccessToken, setLabSessionId } from './useLabPlatformAuth';

export interface PendingSsoLogin {
  userId: number;
  labSessionId: string;
  accessToken: string;
}

export function readPendingSsoLoginFromUrl(): PendingSsoLogin | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get('sso') !== '1') {
    return null;
  }
  const userId = Number(params.get('userId'));
  const labSessionId = params.get('labSessionId')?.trim() ?? '';
  const accessToken = params.get('accessToken')?.trim() ?? '';
  if (!userId || !labSessionId || !accessToken) {
    return null;
  }
  return {
    userId,
    labSessionId,
    accessToken,
  };
}

export function stripSsoParamsFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  for (const key of ['sso', 'userId', 'labSessionId', 'accessToken']) {
    url.searchParams.delete(key);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next || '/');
}

export function emitPendingSsoSocketLogin(
  socketConnection: Ref<Socket | null>,
  pending: PendingSsoLogin,
): boolean {
  if (!socketConnection.value?.connected) {
    return false;
  }
  setLabAccessToken(pending.accessToken);
  setLabSessionId(pending.labSessionId);
  socketConnection.value.emit(SOCKET_EVENTS.USER_LOGIN, {
    userId: pending.userId,
    isAutoLogin: true,
  } satisfies UserLoginEventData);
  return true;
}
