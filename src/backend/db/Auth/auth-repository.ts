import {
  createUsersTable,
  createUserGlobalPermissionsTable,
  createUserAppPermissionsTable,
  createUserAppDomainRolesTable,
  createIndexes,
  seedDefaultAdmin,
  seedDefaultAdminGlobalPermissions,
  seedDefaultAdminAppPermissions,
  AuthSQLStatementKeys,
  createAuthSQLStatements,
  AuthSQLStatementKey
} from './auth-schema';
import { ensureSeedDemoUsers } from './seed-demo-users';
import { ensureLabPlatformSystemUser } from './ensure-lab-platform-system-user';
import {
  ensureUsersIsSystemColumn,
  seedLabPlatformSystemUser,
  seedLabPlatformSystemUserGlobalPermissions,
} from './auth-schema';
import {
  LAB_PLATFORM_SYSTEM_USER_EMAIL,
  LAB_PLATFORM_SYSTEM_USER_ID,
  LAB_PLATFORM_SYSTEM_USER_NAME,
} from '@/shared/config/lab-platform-system-user';
import { ensureUsersMustChangePasswordColumn, ensureUsersDeveloperModeColumn } from './auth-user-migration';
import { ensureCanModifyTagsPermissionColumns } from './auth-permissions-migration';
import { ensureUserAuthIdentitiesSchema } from './auth-oidc-migration';
import { isAdminPasswordResetRequired } from '@/shared/config/lab-admin-password-reset';
import { LabSessionService } from '../../auth/lab-session-service';
import { User, UserRole, UserStatus, UserPermissions } from '../../../shared/types';
import type { Statement } from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { Repository } from '../Repository';

interface UserGlobalPermissionsRow {
  canLaunchApps: number;
  canTeardownApps: number;
  canUpdateApps: number;
  canViewLogs: number;
  canManageUsers: number;
  canDeleteApps: number;
  canManageApps: number;
  canCreateApps: number;
  canModifyTags: number;
}

interface UserAppPermissionRow {
  appId: string;
  canLaunch: number;
  canTeardown: number;
  canUpdate: number;
  canViewLogs: number;
  canModifyTags: number;
}

/**
 * Substitute the automation account's identity into a seed statement.
 *
 * The id/email/name live in [`lab-platform-system-user`](../../../shared/config/lab-platform-system-user.ts)
 * and are interpolated here (like `seedDefaultAdmin`'s `{{PASSWORD_HASH}}`) because `db.exec` takes SQL,
 * not bound parameters. Every value is escaped, so a name with an apostrophe cannot break the statement.
 */
export function resolveLabPlatformSystemUserSeed(statement: string): string {
  const escape = (value: string | number): string =>
    typeof value === 'number' ? String(value) : value.replace(/'/g, "''");
  return statement
    .replace(/\{\{SYSTEM_USER_ID\}\}/g, escape(LAB_PLATFORM_SYSTEM_USER_ID))
    .replace(/\{\{SYSTEM_USER_EMAIL\}\}/g, escape(LAB_PLATFORM_SYSTEM_USER_EMAIL))
    .replace(/\{\{SYSTEM_USER_NAME\}\}/g, escape(LAB_PLATFORM_SYSTEM_USER_NAME));
}

export class AuthRepository extends Repository {
  private statements = {} as Record<AuthSQLStatementKey, Statement>;
  private adminPassword: string = 'admin';
  private demoUserPassword: string = 'demo';

  close(): void {
    this.statements = {} as Record<AuthSQLStatementKey, Statement>;
  }

  async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createUsersTable);
      ensureUsersMustChangePasswordColumn(this.db);
      ensureUsersDeveloperModeColumn(this.db);
      ensureUsersIsSystemColumn(this.db);
      ensureUserAuthIdentitiesSchema(this.db);
      this.db.exec(createUserGlobalPermissionsTable);
      this.db.exec(createUserAppPermissionsTable);
      ensureCanModifyTagsPermissionColumns(this.db);
      this.db.exec(createUserAppDomainRolesTable);
      this.db.exec(createIndexes);
      this.statements = createAuthSQLStatements(this.db);
      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const count = countResult.count;
      if (count === 0 && typeof count === 'number') {
        const resolvedPassword = await bcrypt.hash(this.adminPassword, 12);
        this.db.exec(seedDefaultAdmin.replace(/{{PASSWORD_HASH}}/, resolvedPassword));
        this.db.exec(seedDefaultAdminGlobalPermissions);
        // Reserve the automation account in the **same** creation step as the admin, so its id is
        // deterministic instead of landing wherever the demo seed left off. See the doc comment on
        // `seedLabPlatformSystemUser` for why that ordering matters.
        this.db.exec(resolveLabPlatformSystemUserSeed(seedLabPlatformSystemUser));
        this.db.exec(resolveLabPlatformSystemUserSeed(seedLabPlatformSystemUserGlobalPermissions));
        this.db.exec(seedDefaultAdminAppPermissions);
        if (isAdminPasswordResetRequired()) {
          this.db.prepare(`UPDATE users SET must_change_password = 1 WHERE id = 1`).run();
        }
      }
      await this.ensureDefaultAdminPasswordResetFlag();
      const demoHash = await bcrypt.hash(this.demoUserPassword, 12);
      ensureSeedDemoUsers(this.db, demoHash);
      // Every workflow DM is sent from this account, so a conflict here is a misdelivery waiting to
      // happen — surface it instead of letting it pass as a successful boot.
      const systemUser = ensureLabPlatformSystemUser(this.db);
      if (systemUser.status === 'conflict') {
        console.error(
          `[THE-LAB] Automation account id ${systemUser.userId} is occupied by ` +
            `"${systemUser.occupantEmail}". Workflow DMs from THE-LAB cannot be delivered safely. ` +
            'Run `npm run verify:platform-system-user` for a diagnosis.',
        );
      }
      LabSessionService.getInstance().bootstrap(this.db);
    }
  }

  private mapRowToUser(result: Record<string, unknown>): User {
    const userId = Number(result.id);
    const displayName = (result.name as string) || String(result.name ?? '').toLowerCase();
    const permissions = this.getUserPermissions(userId);

    return {
      userId,
      name: displayName,
      email: result.email as string,
      role: result.role as UserRole,
      status: ((result.status as UserStatus) || 'active') as UserStatus,
      avatar: (result.avatar as string) || undefined,
      lastSeen: result.last_seen
        ? new Date(result.last_seen as string).toISOString()
        : new Date().toISOString(),
      createdAt: result.created_at
        ? new Date(result.created_at as string).toISOString()
        : new Date().toISOString(),
      passwordHash: result.password_hash as string | undefined,
      mustChangePassword: Boolean(result.must_change_password),
      isDeveloperMode: Boolean(result.developer_mode),
      permissions,
    };
  }

  findUserById(id: number): User | null {

    const result = this.statements[AuthSQLStatementKeys.users].get(id);
    if (!result) return null;

    return this.mapRowToUser(result as Record<string, unknown>);
  }


  findUserByName(name: string): User | null {

    const result = this.statements[AuthSQLStatementKeys.users_by_name].get(name);
    if (!result) return null;

    return this.mapRowToUser(result as Record<string, unknown>);
  }

  findUserByEmail(email: string): User | null {

    const result = this.statements[AuthSQLStatementKeys.users_by_email].get(email);
    if (!result) return null;

    return this.mapRowToUser(result as Record<string, unknown>);
  }

  /**
   * Case-insensitive email lookup for automation callers (workflow recipients).
   *
   * Separate from [`findUserByEmail`](auth-repository.ts:129) on purpose: sign-in must keep matching
   * the address exactly as stored, while a recipient named in an event payload comes from a third
   * party and is case-normalised by whoever sent it. Returns null for an empty address so a blank
   * payload field cannot resolve to the first row in the table.
   */
  findUserByEmailIgnoreCase(email: string): User | null {
    const trimmed = email.trim();
    if (!trimmed) {
      return null;
    }
    const result = this.statements[AuthSQLStatementKeys.users_by_email_ci].get(trimmed);
    if (!result) return null;

    return this.mapRowToUser(result as Record<string, unknown>);
  }

  updateUser(id: number, updates: Partial<Pick<User, 'email' | 'name' | 'role' | 'status' | 'lastSeen' | 'avatar' | 'permissions' | 'isDeveloperMode'>>): User | null {
    let userUpdated = false;

    const fieldUpdates: { column: string; value: string | number | null }[] = [];
    if (updates.email !== undefined) fieldUpdates.push({ column: 'email', value: updates.email });
    if (updates.name !== undefined) fieldUpdates.push({ column: 'name', value: updates.name });
    if (updates.role !== undefined) fieldUpdates.push({ column: 'role', value: updates.role });
    if (updates.lastSeen !== undefined) fieldUpdates.push({ column: 'last_seen', value: updates.lastSeen });
    if (updates.status !== undefined) fieldUpdates.push({ column: 'status', value: updates.status });
    if (updates.avatar !== undefined) fieldUpdates.push({ column: 'avatar', value: updates.avatar ?? null });
    if (updates.isDeveloperMode !== undefined) {
      fieldUpdates.push({ column: 'developer_mode', value: updates.isDeveloperMode ? 1 : 0 });
    }

    if (fieldUpdates.length > 0) {
      const setClause = fieldUpdates.map((f) => `${f.column} = ?`).join(', ');
      const values = fieldUpdates.map((f) => f.value);
      const preparedUpdate = this.db.prepare(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      );
      const result = preparedUpdate.run(...values, id);
      userUpdated = result.changes > 0;
    }

    // Update permissions if provided
    if (updates.permissions !== undefined && typeof updates.permissions === 'object') {
      this.updateUserPermissions(id, updates.permissions);
      userUpdated = true;
    }

    if (!userUpdated) {
      return null;
    }

    return this.findUserById(id);
  }

  private updateUserPermissions(userId: number, permissions: UserPermissions): void {
    const { global, app } = permissions;

    // Update global permissions
    if (global !== undefined) {
      this.db.transaction(() => {
        this.statements[AuthSQLStatementKeys.insert_user_global_permissions].run(
          userId,
          global.canLaunchApps ? 1 : 0,
          global.canTeardownApps ? 1 : 0,
          global.canUpdateApps ? 1 : 0,
          global.canViewLogs ? 1 : 0,
          global.canManageUsers ? 1 : 0,
          global.canDeleteApps ? 1 : 0,
          global.canManageApps ? 1 : 0,
          global.canCreateApps ? 1 : 0,
          global.canModifyTags ? 1 : 0,
        );
      })();
    }

    // Update app permissions - delete existing and insert new ones
    if (app !== undefined && Array.isArray(app)) {
      // Delete all existing app permissions for this user
      const deleteStmt = this.db.prepare('DELETE FROM user_app_permissions WHERE userid = ?');
      deleteStmt.run(userId);

      // Insert new app permissions
      const insertStmt = this.db.prepare(
        'INSERT INTO user_app_permissions (userid, appId, canLaunch, canTeardown, canUpdate, canViewLogs, canModifyTags) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );

      for (const appPerm of app) {
        this.db.transaction(() => {
          insertStmt.run(
            userId,
            appPerm.appId,
            appPerm.canLaunch ? 1 : 0,
            appPerm.canTeardown ? 1 : 0,
            appPerm.canUpdate ? 1 : 0,
            appPerm.canViewLogs ? 1 : 0,
            appPerm.canModifyTags ? 1 : 0,
          );
        })();
      }
    }
  }

  getUsers(): User[] {

    const results = this.statements[AuthSQLStatementKeys.users_all].all() as Record<string, unknown>[];
    return results.map((result) => this.mapRowToUser(result));
  }

  findUsersByRole(role: string): User[] {

    const results = this.statements[AuthSQLStatementKeys.users_by_role].all(role) as Record<
      string,
      unknown
    >[];
    return results.map((result) => this.mapRowToUser(result));
  }

  getUserPermissions(userId: number): UserPermissions {
    // 1. Fetch global permissions (one row or none)
    const global = this.statements[AuthSQLStatementKeys.user_global_permissions].get(userId) as
      | UserGlobalPermissionsRow
      | undefined;

    // 2. Fetch app-specific permissions (zero or many)
    const appPermissions = this.statements[AuthSQLStatementKeys.user_app_permissions].all(
      userId,
    ) as UserAppPermissionRow[];

    const result: UserPermissions = {
      global: global
        ? {
          canLaunchApps: !!global.canLaunchApps,
          canTeardownApps: !!global.canTeardownApps,
          canUpdateApps: !!global.canUpdateApps,
          canViewLogs: !!global.canViewLogs,
          canManageUsers: !!global.canManageUsers,
          canDeleteApps: !!global.canDeleteApps,
          canManageApps: !!global.canManageApps,
          canCreateApps: !!global.canCreateApps,
          canModifyTags: !!global.canModifyTags,
        }
        : undefined,

      app: [],
    };

    // 3. Convert each DB row into an AppPermission object
    for (const perm of appPermissions) {
      result.app!.push({
        appId: perm.appId,
        canLaunch: !!perm.canLaunch,
        canTeardown: !!perm.canTeardown,
        canUpdate: !!perm.canUpdate,
        canViewLogs: !!perm.canViewLogs,
        canModifyTags: !!perm.canModifyTags,
      });
    }

    return result;
  }

  async createUser(userId: number, email: string, name: string, password: string, role: string): Promise<User> {
    const resolvedPassword = await bcrypt.hash(password, 12);
    let _dbUserId = userId;

    this.db.transaction(() => {
      if (userId === 0 || userId === undefined) {
        const latestUserIdResult = this.statements[AuthSQLStatementKeys.user_latest].pluck().get()
        const latestUserId = Number(latestUserIdResult)
        _dbUserId = latestUserId + 1
      }

      if (_dbUserId > 1) {
        this.statements[AuthSQLStatementKeys.insert_user].run(
          _dbUserId,
          email,
          resolvedPassword,
          name,
          role
        );
      }
    })();

    return this.findUserById(_dbUserId) as User;
  }

  async createSsoUser(email: string, name: string, role: string): Promise<User> {
    let _dbUserId = 0;

    this.db.transaction(() => {
      const latestUserIdResult = this.statements[AuthSQLStatementKeys.user_latest].pluck().get();
      const latestUserId = Number(latestUserIdResult);
      _dbUserId = latestUserId + 1;

      if (_dbUserId > 1) {
        this.statements[AuthSQLStatementKeys.insert_user].run(
          _dbUserId,
          email,
          null,
          name,
          role,
        );
      }
    })();

    return this.findUserById(_dbUserId) as User;
  }

  findAuthIdentityByProviderSubject(
    provider: string,
    providerSubject: string,
  ): { id: number; userid: number; email: string | null; email_verified: number } | null {
    const row = this.db
      .prepare(
        `SELECT id, userid, email, email_verified FROM user_auth_identities WHERE provider = ? AND provider_subject = ?`,
      )
      .get(provider, providerSubject) as
      | { id: number; userid: number; email: string | null; email_verified: number }
      | undefined;
    return row ?? null;
  }

  insertAuthIdentity(
    userId: number,
    provider: string,
    providerSubject: string,
    email: string,
    emailVerified: boolean,
  ): void {
    this.db
      .prepare(
        `INSERT INTO user_auth_identities (userid, provider, provider_subject, email, email_verified, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run(userId, provider, providerSubject, email, emailVerified ? 1 : 0);
  }

  updateAuthIdentityEmail(identityId: number, email: string, emailVerified: boolean): void {
    this.db
      .prepare(
        `UPDATE user_auth_identities SET email = ?, email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(email, emailVerified ? 1 : 0, identityId);
  }

  setUserEmailVerified(userId: number, verified: boolean): void {
    this.db
      .prepare(`UPDATE users SET email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(verified ? 1 : 0, userId);
  }

  grantGlobalPermission(
    userId: number,
    canLaunch: boolean | undefined,
    canTeardown: boolean | undefined,
    canUpdate: boolean | undefined,
    canViewLogs: boolean | undefined,
    canManageUsers: boolean | undefined,
    canDeleteApps: boolean | undefined,
    canManageApps: boolean | undefined,
    canCreateApps: boolean | undefined,
    canModifyTags: boolean | undefined = undefined,
  ): void {

    this.db.transaction(() => {
      this.statements[AuthSQLStatementKeys.insert_user_global_permissions].run(
        userId,
        canLaunch ? 1 : 0,
        canTeardown ? 1 : 0,
        canUpdate ? 1 : 0,
        canViewLogs ? 1 : 0,
        canManageUsers ? 1 : 0,
        canDeleteApps ? 1 : 0,
        canManageApps ? 1 : 0,
        canCreateApps ? 1 : 0,
        canModifyTags ? 1 : 0,
      );
    })();
  }

  revokePermission(
    userId: number,
    appId: string
  ): void {

    this.db.transaction(() => {
      this.statements[AuthSQLStatementKeys.delete_user_app_permissions].run(userId, appId);
    })();
  }

  deleteUser(userId: number): void {

    this.db.transaction(() => {
      this.statements[AuthSQLStatementKeys.delete_user].run(userId);
    })();
  }

  updateUserLastActive(userId: number): void {

    this.db.transaction(() => {
      this.statements[AuthSQLStatementKeys.user_last_active].run(
        userId
      );
    })();
  }

  async ensureDefaultAdminPasswordResetFlag(): Promise<void> {
    if (!isAdminPasswordResetRequired()) {
      return;
    }
    const row = this.db
      .prepare('SELECT password_hash FROM users WHERE id = 1')
      .get() as { password_hash?: string } | undefined;
    if (!row?.password_hash) {
      return;
    }
    const stillDefault = await bcrypt.compare(this.adminPassword, row.password_hash);
    if (stillDefault) {
      this.db.prepare('UPDATE users SET must_change_password = 1 WHERE id = 1').run();
    }
  }

  async updateUserPasswordHash(userId: number, passwordHash: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(passwordHash, userId);
  }

  async verifyPassword(plainTextPassword: string, storedHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainTextPassword, storedHash);
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }
}

export const authRepository = new AuthRepository();
