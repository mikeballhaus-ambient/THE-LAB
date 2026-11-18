/**
 * WebSocket Routes for Authorization and User Management
 * 
 * Phase 5: uthentication with User Service integration
 * Handles all user management operations via Socket.IO events
 * 
 * @module routes/auth
 */

import { User, AuthSocket } from '../../shared/types/auth';
import { SOCKET_EVENTS, AppPermissionChangedEventData, UserPermissionsChangedEventData, UserLoadEventData, UserLoadMCPEventData } from '../../shared/types';
import * as authRoutesUtils from './utils/auth-routes-utils'

// Phase 5: User Authentication Handlers
import {
  UserLoginEventData,
  UserRegisterEventData,
  UserAuthenticatedEventData,
  PermissionCheckType,
  CreateUserData,
  RevokePermissionData,
  GrantPermissionData,
  DeleteUserData,
  RoleChangeData,
  UpdatePermissionsData,
} from '../../shared/types';

export function initializeUserManagementHandlers(socket: AuthSocket): void {

  // Helper to check permission
  const hasPermission = (permission: PermissionCheckType): boolean => {
    return authRoutesUtils.checkPermission(socket, permission);
  };

  // User list
  socket.on(SOCKET_EVENTS.USER_LIST_REQUEST, async () => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleUserList(socket);
    socket.emit(SOCKET_EVENTS.USER_LIST_RESPONSE, response);
  });

  // User update permissions
  socket.on(SOCKET_EVENTS.USER_UPDATE_PERMISSIONS_REQUEST, async (data: UpdatePermissionsData) => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleUserUpdatePermissions(socket, data);
    socket.emit(SOCKET_EVENTS.USER_UPDATE_PERMISSIONS_RESPONSE, response);
  });

  // User role change
  socket.on(SOCKET_EVENTS.USER_ROLE_CHANGE_REQUEST, async (data: RoleChangeData) => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleUserRoleChange(socket, data);
    socket.emit(SOCKET_EVENTS.USER_ROLE_CHANGE_RESPONSE, response);
  });

  // User deletion
  socket.on(SOCKET_EVENTS.USER_DELETED_REQUEST, async (data: DeleteUserData) => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleUserDelete(socket, data);
    socket.emit(SOCKET_EVENTS.USER_DELETED_RESPONSE, response);
  });

  // User creation
  socket.on(SOCKET_EVENTS.USER_CREATED_REQUEST, async (data: CreateUserData) => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleUserCreated(socket, data);
    socket.emit(SOCKET_EVENTS.USER_CREATED_RESPONSE, response);
  });

  // App permission grant
  socket.on(SOCKET_EVENTS.APP_PERMISSION_GRANTED, async (data: GrantPermissionData) => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleAppPermissionGrant(socket, data);
    socket.emit(SOCKET_EVENTS.APP_PERMISSION_GRANTED, {
      success: response.success,
      message: response.message || 'App permission granted',
      data: response.data as AppPermissionChangedEventData['data'],
    } satisfies AppPermissionChangedEventData);
  });

  // App permission revoke
  socket.on(SOCKET_EVENTS.APP_PERMISSION_REVOKED, async (data: RevokePermissionData) => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleAppPermissionRevoke(socket, data);
    socket.emit(SOCKET_EVENTS.APP_PERMISSION_REVOKED, {
      success: response.success,
      message: response.message || 'App permission revoked',
      data: response.data as AppPermissionChangedEventData['data'],
    } satisfies AppPermissionChangedEventData);
  });

  // Handle user permissions changes (broadcast to other connected users)
  socket.on(SOCKET_EVENTS.USER_PERMISSIONS_CHANGED, async (data: UpdatePermissionsData) => {
    if (!hasPermission('manageUsers')) {
      return;
    }

    const response = await authRoutesUtils.handleUserUpdatePermissions(socket, data);
    if (response.success) {
      socket.broadcast.emit(SOCKET_EVENTS.USER_PERMISSIONS_CHANGED, {
        success: true,
        userId: data.userId!,
        data: response.data
      } satisfies UserPermissionsChangedEventData);
    }
  });

  // User login handler
  socket.on(SOCKET_EVENTS.USER_LOGIN, async (data: UserLoginEventData) => {
    const response = await authRoutesUtils.handleUserLogin(socket, data);
    socket.emit(SOCKET_EVENTS.USER_AUTHENTICATED, response as UserAuthenticatedEventData);
    if (response.userId && !response.mustChangePassword) {
      const userLoadData = await authRoutesUtils.handleLoadUserData(response.userId)
      socket.emit(SOCKET_EVENTS.LOAD_USER_DATA, userLoadData as UserLoadEventData);
      const userLoadMCPData = await authRoutesUtils.handleLoadMCPUserData(response.userId);
      socket.emit(SOCKET_EVENTS.LOAD_MCP_DATA, userLoadMCPData as UserLoadMCPEventData);
      authRoutesUtils.scheduleMcpServersBackgroundConnect(response.userId);
    }
  });

  // User registration handler
  socket.on(SOCKET_EVENTS.USER_REGISTER, async (data: UserRegisterEventData) => {
    const response = await authRoutesUtils.handleUserRegister(socket, data);
    socket.emit(SOCKET_EVENTS.USER_REGISTER, response);
  });

  // User logout handler
  socket.on(SOCKET_EVENTS.USER_LOGOUT, async () => {
    const response = await authRoutesUtils.handleUserLogout(socket);
    socket.emit(SOCKET_EVENTS.USER_LOGOUT, response);
  });

  // User get handler
  socket.on(SOCKET_EVENTS.USER_GET, async (data?: { userId?: number }) => {
    const response = await authRoutesUtils.handleUserGet(socket, data);
    socket.emit(SOCKET_EVENTS.USER_GET_RESPONSE, response);
  });

  // User update handler
  socket.on(SOCKET_EVENTS.USER_UPDATE, async (data: User) => {
    const response = await authRoutesUtils.handleUserUpdate(socket, data);
    socket.emit(SOCKET_EVENTS.USER_UPDATE_RESPONSE, response);
  });

  // Log when handlers are initialized
  console.log(`[AUTH ROUTES] User management handlers initialized for socket ${socket.id}`);
}
