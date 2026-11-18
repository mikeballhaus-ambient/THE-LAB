import {
  User,
  UserRole,
  AuthSocket,
  PermissionCheckType,
  CreateUserData,
  ResponseData,
  UpdatePermissionsData,
  RoleChangeData,
  GrantPermissionData,
  RevokePermissionData,
  DeleteUserData,
  UserLoginEventData,
  UserAuthenticatedEventData,
  UserRegisterEventData,
  IMCPServerConfig,
  UserLoadEventData,
  UserLoadMCPEventData,
  MCPServerUpdateEventData,
  SOCKET_EVENTS,
} from '../../../shared/types';
import { ProviderService } from '@/backend/ai/provider-service';
import { RoleManager } from '../../../shared/services/RoleManager';
import userService, { UserService } from '../../db/Auth/auth-service';
import { LabSessionService } from '../../auth/lab-session-service';
import { isLabPlatformSystemUserId } from '@/shared/config/lab-platform-system-user';
import { toPublicUser } from '@/shared/utils/public-user';
import { PersonaService } from '@/backend/db/Persona/persona-service';
import { AIProviderService } from '@/backend/db/AIProvider/ai-provider-service';
import { CommandService } from '@/backend/db/Command/command-service';
import { ContextSettingsService } from '@/backend/db/ContextSettings/context-settings-service';
import { UserInstructionsService } from '@/backend/db/UserInstructions/user-instructions-service';
import { mcpServersService } from '@/backend/db/MCPServers/mcp-servers-service';
import { mcpStdioAccessService } from '@/backend/db/MCPStdioAccess/mcp-stdio-access-service';
import { platformAuditService } from '@/backend/db/PlatformAudit/platform-audit-service';
import { MCPServerLoader, mcpServerLoader } from '@/backend/mcp/mcp-server-loader';
function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function checkPermission(socket: AuthSocket, permission: PermissionCheckType): boolean {
  const user = socket.user;

  if (!user) {
    return false;
  }

  const userPermissions = user.permissions;

  if (!userPermissions?.global) {
    return false;
  }

  switch (permission) {
    case 'launch':
      return userPermissions.global.canLaunchApps ? true : false;
    case 'teardown':
      return userPermissions.global.canTeardownApps ? true : false;
    case 'update':
      return userPermissions.global.canUpdateApps ? true : false;
    case 'manageUsers':
      return userPermissions.global.canManageUsers ? true : false;
    default:
      return false;
  }
}

export function handleUserCreated(socket: AuthSocket, data: CreateUserData): ResponseData {
  try {
    // Check authorization
    const user = socket.user;
    if (!user) {
      return {
        success: false,
        user,
        error: 'Authentication required'
      };
    }

    if (!user.permissions?.global?.canManageUsers) {
      return {
        success: false,
        user,
        error: 'Insufficient permissions to create users'
      };
    }

    // Get role permissions for the assigned role
    const rolePermissions = RoleManager.getDefaultPermissions(data.role || 'member');

    // Generate user ID using timestamp
    const newUserId = Date.now();

    const newUser: User = {
      id: newUserId,
      userId: newUserId,
      email: data.email,
      name: data.name,
      role: data.role || 'member' as UserRole,
      status: data.status || 'active',
      lastSeen: new Date().toISOString(),
      permissions: rolePermissions,
      passwordHash: undefined,
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      user: newUser
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: formatUnknownError(error)
    };
  }
}

export async function handleUserList(socket: AuthSocket): Promise<ResponseData> {
  try {
    // Check authorization
    const user = socket.user;
    if (!user || !user.permissions?.global?.canManageUsers) {
      return {
        success: false,
        user,
        error: 'Insufficient permissions to list users'
      };
    }

    const users: User[] = UserService.getInstance()
      .getUsers()
      .filter((u) => !isLabPlatformSystemUserId(u.userId ?? u.id ?? 0));

    return {
      success: true,
      data: users
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: formatUnknownError(error)
    };
  }
}

export async function handleUserUpdatePermissions(socket: AuthSocket, data: UpdatePermissionsData): Promise<ResponseData> {
  try {
    // Check authorization
    const user = socket.user;
    if (!user || !user.permissions?.global?.canManageUsers || !user.id) {
      return {
        success: false,
        user,
        error: 'Insufficient permissions to update user permissions'
      };
    }

    const targetUserId = Number(data.userId ?? user.userId);
    if (!Number.isFinite(targetUserId)) {
      return {
        success: false,
        error: 'Invalid user id for permission update',
      };
    }
    const userUpdated = await userService.updateUser(targetUserId, { permissions: data.permissions });

    return {
      success: true,
      user: userUpdated
    } as ResponseData
  } catch (error: unknown) {
    return {
      success: false,
      error: formatUnknownError(error)
    };
  }
}

export async function handleUserRoleChange(socket: AuthSocket, data: RoleChangeData): Promise<ResponseData> {
  try {
    // Check authorization
    const user = socket.user;
    if (!user || !user.permissions?.global?.canManageUsers) {
      return {
        success: false,
        user,
        error: 'Insufficient permissions to change user roles'
      };
    }

    // Get role restrictions
    const restrictions = RoleManager.getRoleRestrictions(data.role);

    // Update user role using UserService
    const userId = typeof data.userId === 'string' ? parseInt(data.userId, 10) : data.userId;

    const updatedUser = UserService.getInstance().updateUser(userId, { role: data.role });

    if (updatedUser) {
      platformAuditService.record({
        actorUserId: user.id,
        category: 'user',
        action: 'role_change',
        targetType: 'user',
        targetId: String(userId),
        details: { role: data.role, restrictions },
      });
      return {
        success: true,
        user: updatedUser
      };
    } else {
      return {
        success: false
      };
    }

  } catch (error: unknown) {
    return {
      success: false,
      error: formatUnknownError(error)
    };
  }
}

export async function handleUserDelete(socket: AuthSocket, data: DeleteUserData): Promise<ResponseData> {
  try {
    // Check authorization
    const user = socket.user;
    if (!user || !user.permissions?.global?.canManageUsers) {
      return {
        success: false,
        user,
        error: 'Insufficient permissions to delete users'
      };
    }

    // Get user service and delete user
    const userId = typeof data.userId === 'string' ? parseInt(data.userId, 10) : data.userId;

    const deleted = UserService.getInstance().deleteUser(userId);

    if (deleted) {
      platformAuditService.record({
        actorUserId: user.id,
        category: 'user',
        action: 'delete',
        targetType: 'user',
        targetId: String(userId),
      });
    }

    return {
      success: true,
      message: deleted ? `User ${data.userId} deleted successfully` : 'User not found'
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: formatUnknownError(error)
    };
  }
}

export async function handleAppPermissionGrant(socket: AuthSocket, data: GrantPermissionData): Promise<ResponseData> {
  try {
    // Check authorization
    const user = socket.user;
    if (!user || !user.permissions?.global?.canManageUsers) {
      return {
        success: false,
        user,
        error: 'Insufficient permissions to grant app permissions'
      };
    }

    // Grant app permission (in-memory operation)
    await userService.grantAppPermission(data.userId, data.permissions);

    return {
      success: true,
      message: `App permission granted for ${data.appId}`,
      data: { userId: data.userId, appId: data.appId }
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: formatUnknownError(error)
    };
  }
}

export async function handleAppPermissionRevoke(socket: AuthSocket, data: RevokePermissionData): Promise<ResponseData> {
  try {
    // Check authorization
    const user = socket.user;
    if (!user || !user.permissions?.global?.canManageUsers) {
      return {
        success: false,
        user,
        error: 'Insufficient permissions to revoke app permissions'
      };
    }

    // Revoke app permission (in-memory operation)

    await userService.revokeAppPermission(data.userId, data.appId);

    return {
      success: true,
      message: `App permission revoked for ${data.appId}`,
      data: { userId: data.userId, appId: data.appId }
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: formatUnknownError(error)
    };
  }
}

export async function handleUserLogin(socket: AuthSocket, data: UserLoginEventData): Promise<UserAuthenticatedEventData> {
  try {
    const userService = UserService.getInstance();

    // Authenticate user using UserService
    let userRecord: User | null
    if (data.isAutoLogin && data.userId) {
      userRecord = userService.getUserById(data.userId)
    } else if (!data.username || !data.password) {
      return {
        isAuthenticated: false,
      } as UserAuthenticatedEventData;
    } else {
      userRecord = await userService.authenticateUser(data.username, data.password);
    }

    if (!userRecord) {
      return {
        isAuthenticated: false,
      } as UserAuthenticatedEventData;
    }

    // Set user context on socket
    socket.user = userRecord;
    const labSession = LabSessionService.getInstance().createSession(userRecord.userId);
    (socket as AuthSocket).sessionId = labSession.sessionId;

    return {
      isAuthenticated: true,
      userId: userRecord.userId,
      name: userRecord.name,
      role: userRecord.role,
      user: toPublicUser(userRecord),
      mustChangePassword: Boolean(userRecord.mustChangePassword),
      accessToken: labSession.accessToken,
      labSessionId: labSession.sessionId,
    } as UserAuthenticatedEventData;
  } catch {
    return {
      isAuthenticated: false
    } as UserAuthenticatedEventData;
  }
}

export async function handleLoadUserData(userId: number): Promise<UserLoadEventData> {
  return {
    personas: PersonaService.getInstance().getAllPersonasForUser(userId),
    llmProviderConfig: AIProviderService.getInstance().getStructuredUserProviderConfig(userId),
    commands: CommandService.getInstance().getAllCommandsForUser(userId),
    contextSettings: ContextSettingsService.getInstance().getContextSettings(userId),
    userInstructions: UserInstructionsService.getInstance().getUserInstructionsForUser(userId)
  } as UserLoadEventData;
}

import { mcpBackgroundConnectInFlight } from '@/backend/mcp/mcp-connection-state';

export function getMcpLoadPayload(userId: number): UserLoadMCPEventData {
  const resolvedTools = MCPServerLoader.resolveAllToolsForUI(userId);
  const user = userService.getUserById(userId);
  return {
    mcpServers: resolvedTools.mcpServersUpdate,
    tools: resolvedTools.tools,
    stdioAccess: mcpStdioAccessService.getPayloadForUser(user ?? undefined),
  } as UserLoadMCPEventData;
}

/**
 * Fast login path: return DB-seeded MCP metadata immediately.
 * Live MCP connect runs in {@link scheduleMcpServersBackgroundConnect} so login does not block on slow external MCP retries.
 */
export async function handleLoadMCPUserData(userId: number): Promise<UserLoadMCPEventData> {
  return getMcpLoadPayload(userId);
}

export function scheduleMcpServersBackgroundConnect(userId: number): void {
  if (mcpBackgroundConnectInFlight.has(userId)) {
    return;
  }
  mcpBackgroundConnectInFlight.add(userId);

  void (async () => {
    try {
      await ProviderService.getInstance().dispatchUIResponse(
        SOCKET_EVENTS.UPDATE_MCP_SERVER,
        MCPServerLoader.resolveAllToolsForUI(userId) as MCPServerUpdateEventData
      );

      const mcpLoader = mcpServerLoader.getInstance(userId);
      const userMCPServers = mcpServersService.getAllMCPServers(userId);

      for (const server of userMCPServers) {
        if (!server.enabled) {
          continue;
        }
        try {
          await mcpLoader.loadServer(server as IMCPServerConfig);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`[MCP] Background connect failed for ${server.name}: ${message}`);
        }
      }

      const resolvedTools = MCPServerLoader.resolveAllToolsForUI(userId);
      await ProviderService.getInstance().dispatchUIResponse(
        SOCKET_EVENTS.UPDATE_MCP_SERVER,
        resolvedTools as MCPServerUpdateEventData
      );
    } finally {
      mcpBackgroundConnectInFlight.delete(userId);
    }
  })();
}

export async function handleUserRegister(socket: AuthSocket, data: UserRegisterEventData): Promise<UserAuthenticatedEventData> {
  try {
    // Register new user using UserService
    const userRecord = await UserService.getInstance().registerUser({
      name: data.username,
      email: data.email,
      passwordHash: data.password,
      role: data.role
    });

    if ('userId' in userRecord) {

      return {
        isAuthenticated: true,
        userId: userRecord.userId,
        name: userRecord.name,
        role: userRecord.role || 'member',
        user: userRecord,
        personas: PersonaService.getInstance().getAllPersonasForUser(userRecord.userId),
        llmProviderConfig: AIProviderService.getInstance().getStructuredUserProviderConfig(userRecord.userId),
        commands: CommandService.getInstance().getAllCommandsForUser(userRecord.userId),
        contextSettings: ContextSettingsService.getInstance().getContextSettings(userRecord.userId),
      } as UserAuthenticatedEventData;
    }

    return {
      isAuthenticated: false,
    } as UserAuthenticatedEventData;
  } catch {
    return {
      isAuthenticated: false,
    } as UserAuthenticatedEventData;
  }
}

export async function handleUserLogout(socket: AuthSocket): Promise<UserAuthenticatedEventData> {
  try {
    // Cleanup this user's MCP servers on logout
    if (socket.user) {
      mcpServerLoader.cleanupUser(socket.user.userId);
    }

    // Disconnect user and clear socket user
    socket.user = undefined;

    return {
      isAuthenticated: false,
    } as UserAuthenticatedEventData;
  } catch (error: unknown) {
    console.error('[Logout] Error cleaning up:', error);
    return {
      isAuthenticated: false,
    } as UserAuthenticatedEventData;
  }
}

export async function handleUserGet(socket: AuthSocket, data?: { userId?: number }): Promise<UserAuthenticatedEventData | { message?: string }> {
  try {
    const userId = data?.userId || 0;

    const userRecord = UserService.getInstance().getUserById(userId);

    return {
      userId,
      name: userRecord?.name || 'Anonymous',
      role: userRecord?.role || 'member',
      user: userRecord as User,
      isAuthenticated: userRecord ? true : false
    };
  } catch (error: unknown) {
    return {
      message: formatUnknownError(error) || 'Failed to get user'
    } as { message?: string };
  }
}

export async function handleUserUpdate(socket: AuthSocket, data: User): Promise<UserAuthenticatedEventData | { message?: string }> {
  try {
    const caller = socket.user;
    if (!caller) {
      return { isAuthenticated: false } as UserAuthenticatedEventData;
    }

    const userId = data.userId || 0;
    if (!userId) {
      return { message: 'Invalid user id' };
    }

    const isSelf = caller.userId === userId;
    const canManageUsers = Boolean(caller.permissions?.global?.canManageUsers);
    if (!isSelf && !canManageUsers) {
      return { message: 'You do not have permission to update this user' };
    }

    const updates: Parameters<UserService['updateUser']>[1] = {
      email: data.email,
      name: data.name,
      role: data.role,
      avatar: data.avatar,
      status: data.status,
      lastSeen: data.lastSeen,
      permissions: data.permissions,
    };

    if (canManageUsers && (caller.role === 'owner' || caller.role === 'admin')) {
      if (data.isDeveloperMode !== undefined) {
        updates.isDeveloperMode = data.isDeveloperMode;
      }
    }

    const updated = UserService.getInstance().updateUser(userId, updates);
    if (!updated) {
      return { message: 'No changes were applied' };
    }

    const publicUser = toPublicUser(updated);

    if (isSelf) {
      socket.user = updated;
    }

    return {
      isAuthenticated: true,
      userId: updated.userId,
      name: updated.name,
      role: updated.role,
      user: publicUser,
    } as UserAuthenticatedEventData;
  } catch (error: unknown) {
    return {
      message: formatUnknownError(error) || 'Failed to update user',
    };
  }
}