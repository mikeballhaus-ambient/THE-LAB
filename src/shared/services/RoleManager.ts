/**
 * Role Management Service
 * 
 * Manages user roles and permissions with Phase 5's role model.
 * Provides logic for creating users, granting permissions, and checking access.
 * 
 * @module services/RoleManager
 */

import { User, UserRole, UserPermissions } from '@/shared/types/auth';

/**
 * Role restriction result
 */
export interface RoleRestriction {
  hasLaunchRestriction: boolean;
  hasTeardownRestriction: boolean;
  hasUpdateRestriction: boolean;
  hasDeleteRestriction: boolean;
  canManageUsers: boolean;
}

/**
 * Default role-to-permission mapping - Phase 5 role model
 * Role hierarchy: owner > admin > member > viewer
 */
export const DEFAULT_ROLES: Record<UserRole, UserPermissions> = {
  owner: {
    global: {
      canLaunchApps: true,
      canTeardownApps: true,
      canUpdateApps: true,
      canDeleteApps: true,
      canManageUsers: true,
      canViewLogs: true,
      canManageApps: true,
      canCreateApps: true,
      canModifyTags: true,
    },
    app: [],
  },
  admin: {
    global: {
      canLaunchApps: true,
      canTeardownApps: true,
      canUpdateApps: true,
      canDeleteApps: false,
      canManageUsers: true,
      canViewLogs: true,
      canManageApps: true,
      canCreateApps: true,
      canModifyTags: true,
    },
    app: [],
  },
  member: {
    global: {
      canLaunchApps: true,
      canTeardownApps: true,
      canUpdateApps: false,
      canDeleteApps: false,
      canManageUsers: false,
      canViewLogs: false,
      canManageApps: false,
      canCreateApps: false,
    },
    app: [],
  },
  viewer: {
    global: {
      canLaunchApps: false,
      canTeardownApps: false,
      canUpdateApps: false,
      canDeleteApps: false,
      canManageUsers: false,
      canViewLogs: false,
      canManageApps: false,
      canCreateApps: false,
    },
    app: [],
  },
};

/**
 * RoleManager class for managing user roles and permissions
 */
export class RoleManager {

  constructor() { }

  /**
   * Get a static instance of RoleManager as a singleton
   * @returns Singleton RoleManager instance
   */
  public static getInstance(): RoleManager {
    const roleManager = new RoleManager();
    return roleManager;
  }

  /**
   * Get default permissions for a given role
   * @param role - User role
   * @returns Default permissions for the role
   */
  static getDefaultPermissions(role: UserRole): UserPermissions {
    return DEFAULT_ROLES[role] || DEFAULT_ROLES.viewer;
  }

  /**
   * Merge base permissions with custom overrides
   * @param base - Base permissions to merge
   * @param overrides - Custom permission overrides
   * @returns Merged permissions
   */
  static mergePermissions(
    base: UserPermissions,
    overrides?: Partial<UserPermissions>
  ): UserPermissions {
    if (!overrides) return base;

    const merged: UserPermissions = {
      global: { ...base.global },
      app: base.app,
    };

    if (overrides.global) {
      merged.global = { ...merged.global, ...overrides.global };
    }
    if (overrides.app) {
      merged.app = merged.app?.concat(overrides.app);
    }

    return merged;
  }

  /**
   * Get role restrictions for a given role
   * @param role - User role
   * @returns Role restriction result
   */
  static getRoleRestrictions(role: UserRole): RoleRestriction {
    // Default: no restrictions for Phase 3
    return {
      hasLaunchRestriction: false,
      hasTeardownRestriction: false,
      hasUpdateRestriction: false,
      hasDeleteRestriction: false,
      canManageUsers: role === 'owner' || role === 'admin',
    };
  }

  /**
   * Check role-based restrictions for user
   * @param user - User to check
   * @returns Restriction result
   */
  public checkRoleRestriction(user: User): RoleRestriction {
    return RoleManager.getRoleRestrictions(user.role);
  }

  /**
   * Check if user can perform an action based on role
   * @param user - User to check
   * @param action - Action to check (launch, teardown, update, delete)
   * @returns True if user has permission
   */
  public canPerformAction(user: User, action: 'launch' | 'teardown' | 'update' | 'delete'): boolean {
    const role = user.role;
    switch (action) {
      case 'launch':
        return role === 'owner' || role === 'admin' || role === 'member';
      case 'teardown':
        return role === 'owner' || role === 'admin';
      case 'update':
        return role === 'owner' || role === 'admin';
      case 'delete':
        return role === 'owner';
      default:
        return false;
    }
  }

  /**
   * Get role hierarchy for C3 resolution
   * Returns numeric representation of role (higher = higher priority)
   * @param role - User role
   * @returns Role priority (owner=4, admin=3, member=2, viewer=1)
   */
  static getRolePriority(role: UserRole): number {
    switch (role) {
      case 'owner': return 4;
      case 'admin': return 3;
      case 'member': return 2;
      case 'viewer': return 1;
      default: return 1;
    }
  }
}

/**
 * Singleton instance of RoleManager for easy access
 */
export const roleManager = new RoleManager();

// Export singleton pattern for compatibility
let _roleManagerInstance: RoleManager | null = null;
export const RoleManagerSingleton = {
  getInstance(): RoleManager {
    if (!_roleManagerInstance) {
      _roleManagerInstance = new RoleManager();
    }
    return _roleManagerInstance;
  },
  setInstance(instance: RoleManager): void {
    _roleManagerInstance = instance;
  },
};
