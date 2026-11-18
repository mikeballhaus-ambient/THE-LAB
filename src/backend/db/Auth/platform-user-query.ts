import type { User } from '@/shared/types/user';
import {
  PLATFORM_USER_LIST_MAX_LIMIT,
  type PlatformUserListQuery,
  type PlatformUserListResult,
  type PlatformUserLookupOption,
  type PlatformUserPublic,
} from '@/shared/types/platform-users';
import type { UserStatus } from '@/shared/types/user';
import { RoleManager } from '@/shared/services/RoleManager';
import { isLabPlatformSystemUserId } from '@/shared/config/lab-platform-system-user';

export function filterOutPlatformSystemUserUnlessRequested(
  users: User[],
  showSystemUser?: boolean,
): User[] {
  if (showSystemUser) {
    return users;
  }
  return users.filter((u) => !isLabPlatformSystemUserId(u.userId ?? u.id ?? 0));
}

export function toPlatformUserPublic(user: User): PlatformUserPublic {
  const id = user.userId ?? user.id ?? 0;
  return {
    id,
    name: user.name ?? '',
    email: user.email ?? '',
    role: user.role,
    status: user.status,
    avatar: user.avatar ?? null,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
  };
}

/**
 * Whether a user should appear in app-scoped platform user lookups (assignee, owner, etc.).
 * Explicit `user_app_permissions` rows always qualify. Otherwise users with lab-wide
 * launch access (global flag or role default) qualify — matches app launch gates and
 * includes OIDC JIT members who lack per-app permission rows.
 */
export function userHasAppAccess(user: User, appId: string): boolean {
  const perms = user.permissions?.app ?? [];
  if (perms.some((p) => p.appId === appId)) {
    return true;
  }

  const globalLaunch = user.permissions?.global?.canLaunchApps;
  if (globalLaunch === true) {
    return true;
  }
  if (globalLaunch === false) {
    return false;
  }

  return RoleManager.getDefaultPermissions(user.role).global?.canLaunchApps === true;
}

export function filterPlatformUsers(
  users: User[],
  query: PlatformUserListQuery,
): PlatformUserListResult {
  const limit = Math.min(
    Math.max(query.limit ?? 50, 1),
    PLATFORM_USER_LIST_MAX_LIMIT,
  );
  const offset = Math.max(query.offset ?? 0, 0);
  const status: UserStatus = query.status ?? 'active';
  const roleFilter = query.role;
  const appId = query.appId?.trim();

  let filtered = users.filter((u) => u.status === status);
  if (roleFilter) {
    filtered = filtered.filter((u) => u.role === roleFilter);
  }
  if (appId) {
    filtered = filtered.filter((u) => userHasAppAccess(u, appId));
  }
  filtered = filterOutPlatformSystemUserUnlessRequested(filtered, query.showSystemUser);

  filtered = [...filtered].sort((a, b) => {
    const an = (a.name ?? '').localeCompare(b.name ?? '');
    if (an !== 0) {
      return an;
    }
    return (a.userId ?? 0) - (b.userId ?? 0);
  });

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);

  return {
    users: page.map(toPlatformUserPublic),
    total,
    limit,
    offset,
  };
}

export function searchPlatformUserLookup(
  users: User[],
  searchQuery: string,
  options?: {
    appId?: string;
    limit?: number;
    status?: UserStatus;
    showSystemUser?: boolean;
  },
): PlatformUserLookupOption[] {
  const q = searchQuery.trim().toLowerCase();
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), PLATFORM_USER_LIST_MAX_LIMIT);
  const status = options?.status ?? 'active';
  const appId = options?.appId?.trim();

  let filtered = users.filter((u) => u.status === status);
  if (appId) {
    filtered = filtered.filter((u) => userHasAppAccess(u, appId));
  }
  if (q) {
    filtered = filtered.filter((u) => {
      const name = (u.name ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }
  filtered = filterOutPlatformSystemUserUnlessRequested(filtered, options?.showSystemUser);

  return filtered
    .slice(0, limit)
    .map((u) => {
      const id = u.userId ?? u.id ?? 0;
      const label = u.name?.trim() || u.email || `User ${id}`;
      return {
        value: id,
        label,
        ...(u.email ? { email: u.email } : {}),
      };
    });
}
