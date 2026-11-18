/**
 * WebSocket Authentication Middleware Module
 * 
 * Provides Socket.IO middleware for authentication and authorization.
 * Phase 3: Uses client-side SessionManager for session validation
 * Phase 4: Will integrate with database/repository for server-side session management
 * 
 * @module middleware/auth
 */

import type { Socket as RawSocket } from 'socket.io';
import { User, UserRole } from '../../shared/types/auth';
import { RoleManager } from '@/shared/services/RoleManager';
import { LabSessionService } from '../auth/lab-session-service';
import { verifyLabUserJwt } from '../auth/lab-jwt';

/**
 * Extended socket interface with authentication context
 * Added by authMiddleware
 * 
 * Type assertions used instead of module augmentation to avoid
 * conflicts with socket.io's built-in Socket type definition
 */
type AuthExtendedSocket = RawSocket & {
  /** Authenticated user object */
  user?: User;
  /** User ID string */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Email */
  userEmail?: string;
  /** Application permissions */
  appPermissions?: Record<string, unknown>;
  /** Socket room name */
  room?: string;
};

/**
 * Auth context that gets attached to socket after authentication
 */
export interface AuthContext {
  user: User;
  sessionId: string;
  permissions: {
    canLaunchApps: boolean;
    canTeardownApps: boolean;
    canUpdateApps: boolean;
    canDeleteApps: boolean;
    canManageUsers: boolean;
    canCreateSessions: boolean;
    canViewLogs: boolean;
  };
}

/**
 * Socket.IO middleware to validate authentication
 * 
 * Phase 3: Validates client-side session via SessionManager
 * Phase 4: Validates server-side session via database repository lookup
 * 
 * @param socket - Socket.IO socket instance
 * @returns void (middleware)
 */
export const authSocketMiddleware = (
  socket: RawSocket,
  next: (err?: Error) => void
): void => {
  try {
    const authData = socket?.handshake?.auth;
    const labSessionId = authData?.labSessionId as string | undefined;
    const accessToken = authData?.accessToken as string | undefined;
    const legacySessionId = authData?.sessionId as string | undefined;

    const sessionKey = labSessionId ?? legacySessionId;
    let user: User | null = null;

    if (sessionKey) {
      user = LabSessionService.getInstance().resolveSession(sessionKey);
      if (user) {
        (socket as AuthExtendedSocket).sessionId = sessionKey;
      }
    }
    if (!user && accessToken) {
      const payload = verifyLabUserJwt(accessToken);
      if (payload) {
        user = LabSessionService.getInstance().resolveUserFromAccessToken(accessToken);
      }
    }

    if (user) {
      (socket as AuthExtendedSocket).user = user;
      (socket as AuthExtendedSocket).userId = String(user.userId);
      (socket as AuthExtendedSocket).userEmail = user.email;
    }

    next();
  } catch (error) {
    console.error('Auth socket middleware error:', error);
    return next(new Error('Authentication failed'));
  }
};

/**
 * Check if user has required permission for an action
 * 
 * @param user - Authenticated user
 * @param action - Action to check (launch, teardown, update)
 * @param appId - Application ID (from socket room)
 * @returns Permission check result
 */
export const checkPermission = (
  user: User,
  action: 'launch' | 'teardown' | 'update',
  appId: string
): {
  allowed: boolean;
  reason?: string;
} => {
  void appId;
  const userPermissions = user?.permissions;

  if (!userPermissions?.global) {
    return { allowed: false, reason: 'User permissions not found' };
  }

  // Check global permissions first
  switch (action) {
    case 'launch':
      if (!userPermissions.global.canLaunchApps) {
        // Check if user has admin or owner role for Phase 5 enforcement
        if (!['owner', 'admin', 'member'].includes(user.role)) {
          return {
            allowed: false,
            reason: `User '${user.email}' (${user.role}) does not have launch permission`
          };
        }
      }
      break;
    case 'teardown':
      if (!userPermissions.global.canTeardownApps) {
        return {
          allowed: false,
          reason: `User '${user.email}' (${user.role}) does not have teardown permission`
        };
      }
      break;
    case 'update':
      if (!userPermissions.global.canUpdateApps) {
        if (!['owner', 'admin'].includes(user.role)) {
          return {
            allowed: false,
            reason: `User '${user.email}' (${user.role}) does not have update permission`
          };
        }
      }
      break;
    default:
      return { allowed: false, reason: `Unknown action: ${action}` };
  }

  const defaultPermissions = RoleManager.getDefaultPermissions(user.role);

  // Fall back to role-based permissions
  switch (action) {
    case 'launch':
      return { allowed: defaultPermissions.global?.canLaunchApps ? true : false };
    case 'teardown':
      return { allowed: defaultPermissions.global?.canTeardownApps ? true : false };
    case 'update':
      return { allowed: defaultPermissions.global?.canUpdateApps ? true : false };
    default:
      return { allowed: false };
  }
};

/**
 * Convert user ID to User object for client response
 */
export const userIdToUser = (name: number | string): User => {
  return {
    id: parseInt(name.toString(), 10),
    userId: parseInt(name.toString(), 10),
    email: `user${name}@example.com`,
    name: `user${name}`,
    role: 'member' as UserRole,
    status: 'active',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    permissions: {
      global: {
        canLaunchApps: true,
        canTeardownApps: false,
        canUpdateApps: false,
        canViewLogs: false,
        canDeleteApps: false,
        canManageUsers: false,
        canManageApps: false,
        canCreateApps: false,
      },
      app: [],
    },
  };
};

/**
 * Get socket room name for app identification
 */
export const getSocketRoomName = (socket: RawSocket): string => {
  const room = (socket as AuthExtendedSocket).room || '';
  (socket as AuthExtendedSocket).room = room;
  return room;
};

/**
 * Export role manager singleton
 */
export const getRoleManager = (): RoleManager => {
  return RoleManager.getInstance();
};
