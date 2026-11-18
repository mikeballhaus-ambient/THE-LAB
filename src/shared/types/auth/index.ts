/**
 * Client-side authentication helpers for The Lab application
 * Handles client-side auth state management and IndexedDB persistence
 */

import type { User, UserRole, UserStatus } from '../user';
import type { Socket as RawSocket } from 'socket.io';
import { setLabShellUserSnapshot } from '@/shared/auth/lab-shell-user-state';

/**
 * Re-export User types for convenience
 */
export type { User, UserRole, UserStatus };

export type AuthSocket = RawSocket & { user?: User; sessionId?: string };

/**
 * Auth response data for AuthResponseData type
 */
export interface AuthResponseData {
  userId: number;
  username: string;
  email?: string;
  role: UserRole;
  status?: UserStatus;
  lastSeen?: string;
  createdAt: string;
  passwordHash?: string;
  permissions?: UserPermissions
}

export type AuthResponseDataSuccess = AuthResponseData;
export interface AuthResponseDataFailure {
  success: false;
  error: string;
}

/**
 * User update data
 */
export interface UpdateUserData {
  email?: string;
  username?: string;
  password?: string;
}

/**
 * Global permissions type
 */
export type GlobalPermissions = {
  canLaunchApps?: boolean;
  canTeardownApps?: boolean;
  canUpdateApps?: boolean;
  canViewLogs?: boolean;
  canManageUsers?: boolean;
  canDeleteApps?: boolean;
  canManageApps?: boolean;
  canCreateApps?: boolean;
  canModifyTags?: boolean;
};

/**
 * App permission interface
 */
export interface AppPermission {
  appId: string;
  canLaunch?: boolean;
  canTeardown?: boolean;
  canUpdate?: boolean;
  canViewLogs?: boolean;
  canModifyTags?: boolean;
}


/**
 * User permissions type
 */
export type UserPermissions = {
  global?: GlobalPermissions;
  app?: AppPermission[];
};

/**
 * Access policy interface for role-based access control
 */
export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  appIds?: string[];
  roles: UserRole[];
  defaultPermissions: Partial<GlobalPermissions>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Base response data type
 */
export interface ResponseData {
  success: boolean;
  message?: string;
  user?: User;
  data?: unknown;
  error?: string;
}

/**
 * User management request types
 */
export interface CreateUserData {
  email: string;
  name: string;
  role?: UserRole;
  status?: 'active' | 'inactive';
}

export interface FindUserData {
  userId: number;
}

export interface FindByEmailData {
  email: string;
}

export interface UpdatePermissionsData {
  userId: string;
  permissions: UserPermissions;
}

export interface RoleChangeData {
  userId: string;
  role: UserRole;
}

export interface DeleteUserData {
  userId: string;
}

export interface GrantPermissionData {
  userId: number;
  appId: string;
  permissions: Partial<AppPermission>;
}

export interface RevokePermissionData {
  userId: number;
  appId: string;
}

/**
 * Permission type for hasPermission function
 */
export type PermissionCheckType = 'launch' | 'teardown' | 'update' | 'view' | 'manageUsers';


/**
 * Validate username format: alphanumeric + underscore, 3-32 chars
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const usernameRegex = /^[a-zA-Z0-9_]{3,32}$/;
  
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Username must be 3-32 alphanumeric characters or underscores' };
  }
  
  return { valid: true };
}

/**
 * Validate email format (if provided)
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: true };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Validate password strength (min 8 chars)
 */
export function validatePassword(password: string): { valid: boolean; error?: string; strength?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required', strength: 'weak' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters', strength: 'weak' };
  }
  
  let strength = 'weak';
  if (password.length >= 12) strength = 'medium';
  if (password.length >= 16 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
    strength = 'strong';
  }
  
  return { valid: true, error: undefined, strength };
}

/**
 * Validate password confirmation matches password
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): { valid: boolean; error?: string } {
  if (!confirmPassword) {
    return { valid: false, error: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  
  return { valid: true };
}


/**
 * Get auth user from localStorage
 */
export function getAuthUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('lab_auth_user');
    if (!userStr) return null;
    
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error('Failed to parse auth user from localStorage:', error);
    return null;
  }
}

/**
 * Save auth user to localStorage
 */
export function setAuthUser(user: User): void {
  localStorage.setItem('lab_auth_user', JSON.stringify(user));
  setLabShellUserSnapshot(user);
}

/**
 * Remove auth user from localStorage (logout)
 */
export function removeAuthUser(): void {
  localStorage.removeItem('lab_auth_user');
  setLabShellUserSnapshot(null);
}

/**
 * Check if user is authenticated
 */
export function isUserAuthenticated(): boolean {
  return getAuthUser() !== null;
}

/**
 * Get current user's role
 */
export function getCurrentUserRole(): UserRole | null {
  const user = getAuthUser();
  return user ? user.role : null;
}

/**
 * Get current user's username
 */
export function getCurrentUserName(): string | null {
  const user = getAuthUser();
  return user && user?.name ? user.name : null;
}

/**
 * Check if user has the specified role
 */
export function hasUserRole(requiredRole: UserRole): boolean {
  if (!isUserAuthenticated()) return false;
  
  const user = getAuthUser();
  if (!user) return false;
  
  // Check if user has required role or a higher role
  const roleHierarchy: UserRole[] = ['viewer', 'member', 'admin', 'owner'];
  const userRoleIndex = roleHierarchy.indexOf(user.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  return userRoleIndex >= requiredRoleIndex;
}

