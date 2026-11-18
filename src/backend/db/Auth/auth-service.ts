import { authRepository } from '../Auth/auth-repository';
import { AppPermission, GlobalPermissions, User, UserPermissions, UserRole } from '../../../shared/types';
import bcrypt from 'bcrypt';
import { ContextSettingsService } from '../ContextSettings/context-settings-service';
import { CommandService } from '../Command/command-service';
import { PersonaService } from '../Persona/persona-service';
import { UserInstructionsService } from '../UserInstructions/user-instructions-service';
import { MCPServersService } from '../MCPServers/mcp-servers-service';
import { DEFAULT_ROLES } from '@/shared/services/RoleManager';
import { labCommsRepository } from '../Comms/lab-comms-repository';
import { AIProviderService } from '../AIProvider/ai-provider-service';

/**
 * UserService - SQLite user persistence layer for Phases 4 and 5
 * Handles all database operations for user management, authentication, and activity tracking
 */
export class UserService {
  private static instance: UserService | null = null;

  private constructor() { }

  public static getInstance(): UserService {
    if (!this.instance) {
      this.instance = new UserService();
    }
    return this.instance;
  }


  async registerSsoUser(userData: {
    name: string;
    email: string;
    role: string;
    provider: string;
    providerSubject: string;
    idpEmailVerified: boolean;
  }): Promise<User> {
    if (authRepository.findUserByName(userData.name)) {
      throw new Error('Name already exists');
    }

    const newUser = await authRepository.createSsoUser(userData.email, userData.name, userData.role);
    authRepository.insertAuthIdentity(
      newUser.userId,
      userData.provider,
      userData.providerSubject,
      userData.email,
      userData.idpEmailVerified,
    );
    if (userData.idpEmailVerified) {
      authRepository.setUserEmailVerified(newUser.userId, true);
    }

    ContextSettingsService.getInstance().ensureUserHasDefaultContextSettings(newUser.userId);
    AIProviderService.getInstance().ensureUserHasDefaultAPIProviders(newUser.userId);
    CommandService.getInstance().ensureUserHasDefaultCommands(newUser.userId);
    MCPServersService.getInstance().ensureUserHasDefaultMCPServers(newUser.userId);
    await PersonaService.getInstance().ensureUserHasDefaultPersonas(newUser.userId);
    UserInstructionsService.getInstance().ensureUserHasDefaultUserInstructions(newUser.userId);

    const role = (userData.role as UserRole) || 'viewer';
    const globalPerms = DEFAULT_ROLES[role] ?? DEFAULT_ROLES.viewer;
    if (globalPerms.global) {
      this.grantGlobalPermission(newUser.userId, globalPerms.global);
    }

    const refreshed = this.getUserById(newUser.userId);
    return (refreshed ?? newUser) as User;
  }

  async promoteUserAfterEmailVerification(userId: number): Promise<User | null> {
    const user = this.getUserById(userId);
    if (!user) {
      return null;
    }
    if (user.role === 'member' || user.role === 'admin' || user.role === 'owner') {
      authRepository.setUserEmailVerified(userId, true);
      return user;
    }
    const updated = authRepository.updateUser(userId, { role: 'member' });
    authRepository.setUserEmailVerified(userId, true);
    if (DEFAULT_ROLES.member.global) {
      this.grantGlobalPermission(userId, DEFAULT_ROLES.member.global);
    }
    return updated ? this.getUserById(userId) : null;
  }

  async registerUser(userData: { name: string; email: string; passwordHash: string, role: string }): Promise<User> {
    const user = authRepository.findUserByName(userData.name);

    if (user) {
      throw new Error('Name already exists');
    }

    let newUser = await authRepository.createUser(0, userData.email, userData.name, userData.passwordHash, userData.role);

    if (newUser.userId) {
      ContextSettingsService.getInstance().ensureUserHasDefaultContextSettings(newUser.userId);
      AIProviderService.getInstance().ensureUserHasDefaultAPIProviders(newUser.userId);
      CommandService.getInstance().ensureUserHasDefaultCommands(newUser.userId);
      MCPServersService.getInstance().ensureUserHasDefaultMCPServers(newUser.userId);
      await PersonaService.getInstance().ensureUserHasDefaultPersonas(newUser.userId);
      UserInstructionsService.getInstance().ensureUserHasDefaultUserInstructions(newUser.userId);

      let globalPerms: UserPermissions = DEFAULT_ROLES.viewer

      switch (newUser.role) {
        case 'owner': globalPerms = DEFAULT_ROLES.owner
          break;
        case 'admin': globalPerms = DEFAULT_ROLES.admin
          break;
        case 'member': globalPerms = DEFAULT_ROLES.member
          break;
        case 'viewer': globalPerms = DEFAULT_ROLES.viewer
          break;
      }

      if (globalPerms.global) {
        this.grantGlobalPermission(newUser.userId, globalPerms.global)

        const _user = this.getUserById(newUser.userId)
        if (_user) newUser = _user
      }
    }

    return newUser as User;
  }

  async authenticateUser(name: string, passwordPlain: string): Promise<User | null> {
    const user = this.getUserByName(name);
    if (!user || !user.passwordHash) {
      return null;
    }

    const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  async changeUserPassword(
    userId: number,
    currentPasswordPlain: string,
    newPasswordPlain: string,
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    const user = this.getUserById(userId);
    if (!user?.passwordHash) {
      return { success: false, error: 'User not found' };
    }
    const currentOk = await bcrypt.compare(currentPasswordPlain, user.passwordHash);
    if (!currentOk) {
      return { success: false, error: 'Current password is incorrect' };
    }
    if (newPasswordPlain.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }
    const newHash = await bcrypt.hash(newPasswordPlain, 12);
    await authRepository.updateUserPasswordHash(userId, newHash);
    const updated = this.getUserById(userId);
    return updated ? { success: true, user: updated } : { success: false, error: 'Update failed' };
  }

  getUserById(id: number): User | null {
    return authRepository.findUserById(id);
  }

  getUserByName(name: string): User | null {
    return authRepository.findUserByName(name);
  }

  /**
   * Case-insensitive email lookup — for automation, not for sign-in.
   *
   * See [`AuthRepository.findUserByEmailIgnoreCase`](auth-repository.ts:137) for why this exists
   * alongside the exact-match method.
   */
  getUserByEmailIgnoreCase(email: string): User | null {
    return authRepository.findUserByEmailIgnoreCase(email);
  }

  getUsers(): User[] {
    return authRepository.getUsers();
  }

  updateUser(id: number, updates: Partial<Pick<User, 'email' | 'name' | 'role' | 'status' | 'lastSeen' | 'avatar' | 'permissions' | 'isDeveloperMode'>>): User | null {
    return authRepository.updateUser(id, updates);
  }

  deleteUser(id: number): boolean {
    const existingUser = this.getUserById(id);
    if (!existingUser) {
      return false;
    }

    labCommsRepository.deleteAllDataForUser(existingUser.userId);
    authRepository.deleteUser(existingUser.userId);
    return true;
  }

  updateUserLastSeen(userId: number): void {
    authRepository.updateUserLastActive(userId);
  }

  grantGlobalPermission(
    userId: number,
    permissions: GlobalPermissions
  ): void {
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    try {
      authRepository.grantGlobalPermission(
        user.userId,
        permissions.canLaunchApps,
        permissions.canTeardownApps,
        permissions.canUpdateApps,
        permissions.canViewLogs,
        permissions.canManageUsers,
        permissions.canDeleteApps,
        permissions.canManageApps,
        permissions.canCreateApps,
        permissions.canModifyTags,
      );
    } catch {}
  }

  grantAppPermission(
    userId: number,
    permissions: Partial<AppPermission>
  ): void {
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const appPermissions = user.permissions?.app || [] as AppPermission[];
    const existingappPermission = appPermissions.find(_ => _.appId == permissions.appId)
    if (existingappPermission) {
      existingappPermission.appId = permissions.appId != undefined ? permissions.appId : existingappPermission.appId
      existingappPermission.canLaunch = permissions.canLaunch != undefined ? permissions.canLaunch : existingappPermission.canLaunch
      existingappPermission.canTeardown = permissions.canTeardown != undefined ? permissions.canTeardown : existingappPermission.canTeardown
      existingappPermission.canUpdate = permissions.canUpdate != undefined ? permissions.canUpdate : existingappPermission.canUpdate
      existingappPermission.canViewLogs = permissions.canViewLogs != undefined ? permissions.canViewLogs : existingappPermission.canViewLogs
      existingappPermission.canModifyTags =
        permissions.canModifyTags != undefined
          ? permissions.canModifyTags
          : existingappPermission.canModifyTags
    } else {
      appPermissions.push({
        appId: permissions.appId,
        canLaunch: permissions.canLaunch,
        canTeardown: permissions.canTeardown,
        canUpdate: permissions.canUpdate,
        canViewLogs: permissions.canViewLogs,
        canModifyTags: permissions.canModifyTags,
      } as AppPermission);
    }

    try {
      authRepository.updateUser(user.userId, {
        permissions: {
          global: user.permissions?.global,
          app: appPermissions
        }
      });
    } catch {}
  }

  revokeAppPermission(
    userId: number,
    appId: string
  ): void {
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    try {
      authRepository.updateUser(user.userId, {
        permissions: {
          global: user.permissions?.global,
          app: user.permissions?.app?.filter(_ => _.appId != appId)
        }
      });
    } catch {}
  }
}

// Singleton instance
export const userService = UserService.getInstance();
export default userService;
