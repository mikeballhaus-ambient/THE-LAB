import { UserService } from './auth-service';
import type { User } from '@/shared/types/user';
import type {
  PlatformUserByIdQuery,
  PlatformUserListQuery,
  PlatformUserListResult,
  PlatformUserLookupOption,
  PlatformUserLookupQuery,
  PlatformUserPublic,
} from '@/shared/types/platform-users';
import { isLabPlatformSystemUserId } from '@/shared/config/lab-platform-system-user';
import {
  filterPlatformUsers,
  searchPlatformUserLookup,
  toPlatformUserPublic,
} from './platform-user-query';

export class PlatformUserService {
  private static instance: PlatformUserService | null = null;

  private constructor() {}

  public static getInstance(): PlatformUserService {
    if (!this.instance) {
      this.instance = new PlatformUserService();
    }
    return this.instance;
  }

  private allUsers(): User[] {
    return UserService.getInstance().getUsers();
  }

  public listUsers(query: PlatformUserListQuery = {}): PlatformUserListResult {
    return filterPlatformUsers(this.allUsers(), query);
  }

  public getUserById(id: number, query: PlatformUserByIdQuery = {}): PlatformUserPublic | null {
    if (isLabPlatformSystemUserId(id) && !query.showSystemUser) {
      return null;
    }
    const user = UserService.getInstance().getUserById(id);
    if (!user) {
      return null;
    }
    return toPlatformUserPublic(user);
  }

  public lookupUsers(
    searchQuery: string,
    options?: PlatformUserLookupQuery,
  ): PlatformUserLookupOption[] {
    return searchPlatformUserLookup(this.allUsers(), searchQuery, options);
  }
}
