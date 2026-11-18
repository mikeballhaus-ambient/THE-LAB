
import type { Database } from 'better-sqlite3';

export const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('owner', 'admin', 'member', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    avatar TEXT,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_system INTEGER NOT NULL DEFAULT 0
  );
`;

/**
 * Adds `users.is_system` to databases created before the automation account was modelled explicitly.
 *
 * The flag is what makes the reserved automation row a **feature** rather than a fake person: Messages
 * renders the read-only automation thread from `partnerKind === 'automation'`, which is derived from this
 * column, instead of comparing a partner id against `LAB_PLATFORM_SYSTEM_USER_ID`. `ALTER TABLE ADD
 * COLUMN` with a default is safe on SQLite and does not rebuild the table.
 */
export function ensureUsersIsSystemColumn(db: Database): void {
  const columns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === 'is_system')) {
    return;
  }
  db.exec('ALTER TABLE users ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0');
}

export const createUserGlobalPermissionsTable = `
  CREATE TABLE IF NOT EXISTS user_global_permissions (
    userid INTEGER NOT NULL,
    canLaunchApps INTEGER NOT NULL DEFAULT 0,
    canTeardownApps INTEGER NOT NULL DEFAULT 0,
    canUpdateApps INTEGER NOT NULL DEFAULT 0,
    canViewLogs INTEGER NOT NULL DEFAULT 0,
    canManageUsers INTEGER NOT NULL DEFAULT 0,
    canDeleteApps INTEGER NOT NULL DEFAULT 0,
    canManageApps INTEGER NOT NULL DEFAULT 0,
    canCreateApps INTEGER NOT NULL DEFAULT 0,
    canModifyTags INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (userid),
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const createUserAppPermissionsTable = `
  CREATE TABLE IF NOT EXISTS user_app_permissions (
    userid INTEGER NOT NULL,
    appId TEXT NOT NULL,
    canLaunch INTEGER NOT NULL DEFAULT 0,
    canTeardown INTEGER NOT NULL DEFAULT 0,
    canUpdate INTEGER NOT NULL DEFAULT 0,
    canViewLogs INTEGER NOT NULL DEFAULT 0,
    canModifyTags INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (userid, appId),
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
  );
`;

/** In-app product roles (CRM agent, help desk supervisor) — separate from launch/teardown in user_app_permissions. */
export const createUserAppDomainRolesTable = `
  CREATE TABLE IF NOT EXISTS user_app_domain_roles (
    userid INTEGER NOT NULL,
    appId TEXT NOT NULL,
    role_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userid, appId, role_key),
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const createIndexes = `
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
  CREATE INDEX IF NOT EXISTS idx_user_app_permissions_user ON user_app_permissions(userid);
  CREATE INDEX IF NOT EXISTS idx_user_app_permissions_app ON user_app_permissions(appId);
  CREATE INDEX IF NOT EXISTS idx_user_app_domain_roles_app ON user_app_domain_roles(appId);
  CREATE INDEX IF NOT EXISTS idx_user_app_domain_roles_user ON user_app_domain_roles(userid);
  CREATE INDEX IF NOT EXISTS user_global_permissions_user ON user_global_permissions(userid);
`;

export const seedDefaultAdmin = `
  INSERT OR IGNORE INTO users (id, email, name, password_hash, role, status)
  VALUES (1, 'admin@${process.env.VITE_API_BASE_URL}', 'Admin', '{{PASSWORD_HASH}}', 'admin', 'active');
`;

export const seedDefaultAdminGlobalPermissions = `
  INSERT OR IGNORE INTO user_global_permissions (userid, canLaunchApps, canTeardownApps, canUpdateApps, canViewLogs, canManageUsers, canDeleteApps, canManageApps, canCreateApps, canModifyTags)
  VALUES (1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
`;

/**
 * Reserved automation account (Messages sender for workflows), created **with** the bootstrap admin.
 *
 * ## Why it is seeded here rather than as a demo user
 *
 * This row used to be inserted only by [`ensureLabPlatformSystemUser`](ensure-lab-platform-system-user.ts),
 * which runs *after* `ensureSeedDemoUsers`. That ordering is the hazard: demo users occupy ids 2–11, so
 * the platform account landed on whichever id SQLite happened to hand out next. A database where demo
 * seeding was skipped, disabled, or where a real user registered early could hand that id to a human —
 * and every workflow DM, `dm:` channel id and unread badge computed from the constant would then address
 * the wrong person.
 *
 * A hard-coded number is only safe when its row is created at database creation, before anything else
 * can claim it. This seed is executed inside the `users` count === 0 bootstrap block, so the id is
 * deterministic on every fresh database, exactly like the admin's `id = 1`.
 *
 * ## Why the id is 12 and not 0
 *
 * `id = 0` would be the natural-looking choice, but the comms layer treats `<= 0` as "no user"
 * (`resolveUserId`, `resolveLabWorkflowRecipientUserId`, `broadcastLabCommsMatchState`) because a parsed
 * missing id is 0. Using 0 would mean auditing every one of those guards and every `AUTOINCREMENT` edge,
 * and a single missed `> 0` check would silently drop automation DMs. 12 is the first id after the demo
 * block (2–11) — the same value the old code arrived at by accident, now guaranteed instead of lucky.
 *
 * The value is **not** referenced by literal here on purpose: it comes from
 * [`LAB_PLATFORM_SYSTEM_USER_ID`](../../../shared/config/lab-platform-system-user.ts) so there is one
 * definition.
 */
export const seedLabPlatformSystemUser = `
  INSERT OR IGNORE INTO users (id, email, name, password_hash, role, status, is_system)
  VALUES (
    {{SYSTEM_USER_ID}},
    '{{SYSTEM_USER_EMAIL}}',
    '{{SYSTEM_USER_NAME}}',
    NULL,
    'viewer',
    'active',
    1
  );
`;

export const seedLabPlatformSystemUserGlobalPermissions = `
  INSERT OR IGNORE INTO user_global_permissions (userid, canLaunchApps, canTeardownApps, canUpdateApps, canViewLogs, canManageUsers, canDeleteApps, canManageApps, canCreateApps, canModifyTags)
  VALUES ({{SYSTEM_USER_ID}}, 0, 0, 0, 0, 0, 0, 0, 0, 0);
`;

export const seedDefaultAdminAppPermissions = `
  INSERT OR IGNORE INTO user_app_permissions (userid, appId, canLaunch, canTeardown, canUpdate, canViewLogs, canModifyTags)
  VALUES (1, 'app-ui-component-gallery', 1, 1, 1, 1, 1);
  INSERT OR IGNORE INTO user_app_permissions (userid, appId, canLaunch, canTeardown, canUpdate, canViewLogs, canModifyTags)
  VALUES (1, 'app-dnd-examples', 1, 1, 1, 1, 1);
  INSERT OR IGNORE INTO user_app_permissions (userid, appId, canLaunch, canTeardown, canUpdate, canViewLogs, canModifyTags)
  VALUES (1, 'app-example-server', 1, 1, 1, 1, 1);
  INSERT OR IGNORE INTO user_app_permissions (userid, appId, canLaunch, canTeardown, canUpdate, canViewLogs, canModifyTags)
  VALUES (1, 'app-ai-tunes', 1, 1, 1, 1, 1);
  INSERT OR IGNORE INTO user_app_permissions (userid, appId, canLaunch, canTeardown, canUpdate, canViewLogs, canModifyTags)
  VALUES (1, 'app-lab-tasklist', 1, 1, 1, 1, 1);
`;

export const AuthSQLStatementKeys = {
    // Users
    users: 'users',
    users_by_email: 'users_by_email',
    users_by_email_ci: 'users_by_email_ci',
    users_by_name: 'users_by_name',
    users_by_role: 'users_by_role',
    users_by_status: 'users_by_status',
    users_all: 'users_all',
    user_last_active: 'user_last_active',
    user_latest: 'user_latest',
    // Global permissions
    user_global_permissions: 'user_global_permissions',

    // App permissions
    user_app_permissions: 'user_app_permissions',
    user_app_permissions_by_app: 'user_app_permissions_by_app',

    // Inserts
    insert_user: 'insert_user',
    insert_user_global_permissions: 'insert_user_global_permissions',
    insert_user_app_permissions: 'insert_user_app_permissions',

    // Deletes
    delete_user: 'delete_user',
    delete_user_global_permissions: 'delete_user_global_permissions',
    delete_user_app_permissions: 'delete_user_app_permissions',
} as const

export type AuthSQLStatementKey = keyof typeof AuthSQLStatementKeys

export const createAuthSQLStatements = (
    db: import('better-sqlite3').Database
): Record<AuthSQLStatementKey, import('better-sqlite3').Statement> => {
    const q = (sql: string) => db.prepare(sql)

    return {
        //
        // USERS
        //
        [AuthSQLStatementKeys.users]: q(`
            SELECT * FROM users WHERE id = ?
        `),

        [AuthSQLStatementKeys.users_by_email]: q(`
            SELECT * FROM users WHERE email = ?
        `),

        /*
         * Case-insensitive lookup for **automation** callers.
         *
         * A workflow recipient comes from an event payload, and an event payload is written by a
         * third party: `Mia.Chen@Lab.local` and `mia.chen@lab.local` are the same mailbox, and
         * refusing one because the caller capitalised it would read as "the workflow is broken".
         * `lower()` on both sides rather than `COLLATE NOCASE` so this cannot disagree with the
         * `users_by_email` statement above about what equality means. Login keeps the exact-match
         * statement — the platform's own auth path is deliberately not relaxed here.
         */
        [AuthSQLStatementKeys.users_by_email_ci]: q(`
            SELECT * FROM users WHERE lower(email) = lower(?)
            LIMIT 1
        `),

        [AuthSQLStatementKeys.users_by_name]: q(`
            SELECT * FROM users WHERE name = ?
        `),

        [AuthSQLStatementKeys.users_by_role]: q(`
            SELECT * FROM users WHERE role = ?
        `),

        [AuthSQLStatementKeys.users_by_status]: q(`
            SELECT * FROM users WHERE status = ?
        `),

        [AuthSQLStatementKeys.users_all]: q(`
            SELECT * FROM users
        `),

        [AuthSQLStatementKeys.user_latest]: q(`
            SELECT max(id) FROM users
        `),

        [AuthSQLStatementKeys.user_last_active]: q(`
            UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?
        `),

        //
        // GLOBAL PERMISSIONS
        //
        [AuthSQLStatementKeys.user_global_permissions]: q(`
            SELECT * FROM user_global_permissions WHERE userid = ?
        `),

        //
        // APP PERMISSIONS
        //
        [AuthSQLStatementKeys.user_app_permissions]: q(`
            SELECT * FROM user_app_permissions WHERE userid = ?
        `),

        [AuthSQLStatementKeys.user_app_permissions_by_app]: q(`
            SELECT * FROM user_app_permissions WHERE appId = ?
        `),

        //
        // INSERTS
        //
        [AuthSQLStatementKeys.insert_user]: q(`
            INSERT OR REPLACE INTO users (
                id, 
                email, 
                password_hash, 
                name, 
                role, 
                created_at, 
                last_seen, 
                updated_at
            ) 
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `),

        [AuthSQLStatementKeys.insert_user_global_permissions]: q(`
            INSERT OR REPLACE INTO user_global_permissions (
                userid,
                canLaunchApps,
                canTeardownApps,
                canUpdateApps,
                canViewLogs,
                canManageUsers,
                canDeleteApps,
                canManageApps,
                canCreateApps,
                canModifyTags
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `),

        [AuthSQLStatementKeys.insert_user_app_permissions]: q(`
            INSERT OR REPLACE INTO user_app_permissions (
                userid,
                appId,
                canLaunch,
                canTeardown,
                canUpdate,
                canViewLogs,
                canModifyTags
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `),

        //
        // DELETES
        //
        [AuthSQLStatementKeys.delete_user]: q(`
            DELETE FROM users WHERE id = ?
        `),

        [AuthSQLStatementKeys.delete_user_global_permissions]: q(`
            DELETE FROM user_global_permissions WHERE userid = ?
        `),


        [AuthSQLStatementKeys.delete_user_app_permissions]: q(`
            DELETE FROM user_app_permissions WHERE userid = ? AND appId = ?
        `),
    }
}
