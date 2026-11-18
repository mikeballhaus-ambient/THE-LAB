import type { Database } from 'better-sqlite3';
import {
  LAB_PLATFORM_SYSTEM_USER_EMAIL,
  LAB_PLATFORM_SYSTEM_USER_ID,
  LAB_PLATFORM_SYSTEM_USER_NAME,
} from '@/shared/config/lab-platform-system-user';

/** What the automation account actually looks like on this database. */
export type LabPlatformSystemUserState =
  | { status: 'ok'; userId: number }
  /** Nothing occupied the id and it is not the automation account — it was inserted just now. */
  | { status: 'created'; userId: number }
  /**
   * The reserved id belongs to a **human** account. Nothing is overwritten: the caller is expected to
   * log loudly, because every workflow DM would otherwise be delivered to that person.
   */
  | { status: 'conflict'; userId: number; occupantEmail: string };

type UserRow = { id: number; email: string };

/**
 * Ensures the platform automation account exists (Messages sender for workflows).
 * No password — not intended for interactive sign-in.
 *
 * ## The conflict case is the important one
 *
 * This runs on every boot, so on a database created by the older code path (automation row inserted
 * *after* demo seeding) or one where a user registered before the automation row existed, the reserved
 * id can already belong to a real person. Silently updating that row would rewrite a human's account
 * into a viewer with no password and route automation DMs to them. The safe response is to leave the
 * occupant alone, report `conflict`, and let the caller surface it — a visible error beats a silent
 * misdelivery.
 *
 * ## `is_system` is the contract
 *
 * The row is marked `is_system = 1`. Messages renders the read-only automation thread from that flag,
 * not from comparing a partner id against a constant, so the id stops being load-bearing for the UI.
 */
export function ensureLabPlatformSystemUser(db: Database): LabPlatformSystemUserState {
  const existing = db
    .prepare(`SELECT id, email FROM users WHERE id = ?`)
    .get(LAB_PLATFORM_SYSTEM_USER_ID) as UserRow | undefined;

  if (existing && existing.email !== LAB_PLATFORM_SYSTEM_USER_EMAIL) {
    return {
      status: 'conflict',
      userId: existing.id,
      occupantEmail: existing.email,
    };
  }

  const created = existing == null;

  if (created) {
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, name, password_hash, role, status, is_system)
       VALUES (?, ?, ?, NULL, 'viewer', 'active', 1)`,
    ).run(LAB_PLATFORM_SYSTEM_USER_ID, LAB_PLATFORM_SYSTEM_USER_EMAIL, LAB_PLATFORM_SYSTEM_USER_NAME);
  } else {
    // Only ever touch the row we own, identified by both id **and** email.
    db.prepare(
      `UPDATE users SET name = ?, status = 'active', is_system = 1
       WHERE id = ? AND email = ?`,
    ).run(LAB_PLATFORM_SYSTEM_USER_NAME, LAB_PLATFORM_SYSTEM_USER_ID, LAB_PLATFORM_SYSTEM_USER_EMAIL);
  }

  db.prepare(
    `INSERT OR IGNORE INTO user_global_permissions (
      userid, canLaunchApps, canTeardownApps, canUpdateApps, canViewLogs,
      canManageUsers, canDeleteApps, canManageApps, canCreateApps, canModifyTags
    ) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
  ).run(LAB_PLATFORM_SYSTEM_USER_ID);

  return { status: created ? 'created' : 'ok', userId: LAB_PLATFORM_SYSTEM_USER_ID };
}
