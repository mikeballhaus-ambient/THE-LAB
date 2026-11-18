import type { UserRole, UserStatus } from './user';

/** Public platform user DTO (no secrets). `id` is THE-LAB `users.id` — use as `lab_user_id` in apps. */
export interface PlatformUserPublic {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar: string | null;
  lastSeen: string;
  createdAt: string;
}

export interface PlatformUserListQuery {
  status?: UserStatus;
  role?: UserRole;
  appId?: string;
  limit?: number;
  offset?: number;
  /** Include THE-LAB automation account (users.id 12). Default false. */
  showSystemUser?: boolean;
}

export interface PlatformUserLookupQuery {
  appId?: string;
  limit?: number;
  status?: UserStatus;
  showSystemUser?: boolean;
}

export interface PlatformUserByIdQuery {
  showSystemUser?: boolean;
}

/** Query string values: `true`, `1`, `yes` (case-insensitive). */
export function parsePlatformUserShowSystemUserFlag(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

export interface PlatformUserListResult {
  users: PlatformUserPublic[];
  total: number;
  limit: number;
  offset: number;
}

/** Picker option for assignee / owner lookups */
export interface PlatformUserLookupOption {
  value: number;
  label: string;
  email?: string;
}

export const PLATFORM_USER_LIST_MAX_LIMIT = 100;
