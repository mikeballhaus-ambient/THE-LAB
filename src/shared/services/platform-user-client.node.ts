import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import type {
  PlatformUserListResult,
  PlatformUserLookupOption,
  PlatformUserPublic,
} from '@/shared/types/platform-users';

import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';

export function resolvePlatformActorUserId(headerValue?: string | string[]): number {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (raw != null && String(raw).trim() !== '') {
    const id = Number.parseInt(String(raw), 10);
    if (!Number.isNaN(id) && id > 0) {
      return id;
    }
  }
  const fromEnv = process.env.PLATFORM_API_ACTOR_USER_ID?.trim();
  if (fromEnv) {
    const id = Number.parseInt(fromEnv, 10);
    if (!Number.isNaN(id) && id > 0) {
      return id;
    }
  }
  throw new Error(
    'Platform actor user id required — pass X-Lab-User-Id with service token or set PLATFORM_API_ACTOR_USER_ID for scripts',
  );
}

/** App server → platform (:3000): service token + acting user (after app validated user). */
export function buildPlatformServiceAuthHeaders(actorUserId: number): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Lab-User-Id': String(actorUserId),
    'X-Lab-App-Service-Token': resolveLabAppServiceToken(),
  };
  return headers;
}

function actorHeaders(actorUserId: number): HeadersInit {
  return buildPlatformServiceAuthHeaders(actorUserId);
}

export async function fetchPlatformUsersLookup(options: {
  actorUserId: number;
  q?: string;
  appId?: string;
  limit?: number;
}): Promise<PlatformUserLookupOption[]> {
  const base = resolvePlatformBackendUrl();
  const params = new URLSearchParams();
  if (options.q?.trim()) {
    params.set('q', options.q.trim());
  }
  if (options.appId?.trim()) {
    params.set('appId', options.appId.trim());
  }
  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }
  const qs = params.toString();
  const url = `${base}/api/platform/users/lookup${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: actorHeaders(options.actorUserId) });
  if (!response.ok) {
    throw new Error(`Platform users lookup failed (${response.status})`);
  }
  const body = (await response.json()) as { success?: boolean; data?: PlatformUserLookupOption[] };
  return body.data ?? [];
}

export async function fetchPlatformUserById(
  actorUserId: number,
  userId: number,
): Promise<PlatformUserPublic | null> {
  const base = resolvePlatformBackendUrl();
  const response = await fetch(`${base}/api/platform/users/${userId}`, {
    headers: actorHeaders(actorUserId),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Platform user fetch failed (${response.status})`);
  }
  const body = (await response.json()) as { success?: boolean; data?: PlatformUserPublic };
  return body.data ?? null;
}

export async function fetchPlatformUsersList(options: {
  actorUserId: number;
  appId?: string;
  limit?: number;
}): Promise<PlatformUserListResult> {
  const base = resolvePlatformBackendUrl();
  const params = new URLSearchParams({ status: 'active' });
  if (options.appId?.trim()) {
    params.set('appId', options.appId.trim());
  }
  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }
  const response = await fetch(`${base}/api/platform/users?${params.toString()}`, {
    headers: actorHeaders(options.actorUserId),
  });
  if (!response.ok) {
    throw new Error(`Platform users list failed (${response.status})`);
  }
  const body = (await response.json()) as { success?: boolean; data?: PlatformUserListResult };
  return body.data ?? { users: [], total: 0, limit: 50, offset: 0 };
}
