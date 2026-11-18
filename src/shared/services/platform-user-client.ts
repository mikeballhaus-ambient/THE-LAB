import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type {
  PlatformUserListResult,
  PlatformUserLookupOption,
  PlatformUserPublic,
} from '@/shared/types/platform-users';
import { PLATFORM_USER_LIST_MAX_LIMIT } from '@/shared/types/platform-users';
import type { User } from '@/shared/types/user';

export function platformUserPublicToUser(dto: PlatformUserPublic): User {
  return {
    userId: dto.id,
    name: dto.name,
    email: dto.email,
    role: dto.role,
    status: dto.status,
    lastSeen: dto.lastSeen,
    createdAt: dto.createdAt,
    avatar: dto.avatar ?? undefined,
  };
}

export interface FetchActivePlatformUsersOptions {
  /** Include THE-LAB automation user — use for Messages roster labels only. */
  showSystemUser?: boolean;
}

/** Active platform users for any authenticated session (DM picker, assignees). */
export async function fetchActivePlatformUsersForClient(
  options: FetchActivePlatformUsersOptions = {},
): Promise<User[]> {
  const base = resolvePlatformBackendUrlForClient().replace(/\/$/, '');
  const users: User[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const params = new URLSearchParams({
      status: 'active',
      limit: String(PLATFORM_USER_LIST_MAX_LIMIT),
      offset: String(offset),
    });
    if (options.showSystemUser) {
      params.set('showSystemUser', 'true');
    }
    const response = await fetch(
      `${base}/api/platform/users?${params.toString()}`,
      labPlatformFetchInit(),
    );
    if (!response.ok) {
      throw new Error(`Platform users list failed (${response.status})`);
    }
    const body = (await response.json()) as { success?: boolean; data?: PlatformUserListResult };
    const page = body.data ?? { users: [], total: 0, limit: PLATFORM_USER_LIST_MAX_LIMIT, offset };
    total = page.total;
    for (const row of page.users) {
      users.push(platformUserPublicToUser(row));
    }
    if (page.users.length === 0) {
      break;
    }
    offset += page.users.length;
  }

  return users;
}

export interface FetchPlatformUserLookupOptions {
  q?: string;
  appId?: string;
  limit?: number;
}

/** Searchable user picker options (any authenticated role may list assignees). */
export async function fetchPlatformUserLookupForClient(
  options: FetchPlatformUserLookupOptions = {},
): Promise<PlatformUserLookupOption[]> {
  const base = resolvePlatformBackendUrlForClient().replace(/\/$/, '');
  const params = new URLSearchParams();
  const q = options.q?.trim();
  if (q) {
    params.set('q', q);
  }
  if (options.appId?.trim()) {
    params.set('appId', options.appId.trim());
  }
  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }
  const query = params.toString();
  const response = await fetch(
    `${base}/api/platform/users/lookup${query ? `?${query}` : ''}`,
    labPlatformFetchInit(),
  );
  if (!response.ok) {
    throw new Error(`Platform user lookup failed (${response.status})`);
  }
  const body = (await response.json()) as { success?: boolean; data?: PlatformUserLookupOption[] };
  return Array.isArray(body.data) ? body.data : [];
}
