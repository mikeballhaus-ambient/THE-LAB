import { Repository } from '../Repository';
import {
  createPlatformAuditLogIndexes,
  createPlatformAuditLogTable,
} from './platform-audit-schema';

/**
 * Audit categories.
 *
 * `workflow` is separate from `app` because an authoring decision and a registry change are
 * investigated differently: "who enabled a money-writing automation" is a governance question, and
 * burying it among app installs makes it hard to answer.
 */
export type PlatformAuditCategory = 'user' | 'app' | 'mcp_server' | 'workflow';

export interface PlatformAuditEntry {
  id: number;
  actorUserId: number | null;
  category: PlatformAuditCategory;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detailsJson: string | null;
  createdAt: string;
}

export class PlatformAuditRepository extends Repository {
  close(): void {
    /* statements are prepared per call */
  }

  async initialize(): Promise<void> {
    if (!this.db) return;
    this.db.exec(createPlatformAuditLogTable);
    this.db.exec(createPlatformAuditLogIndexes);
  }

  insert(entry: {
    actorUserId: number | null;
    category: PlatformAuditCategory;
    action: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  }): void {
    this.db
      .prepare(
        `INSERT INTO platform_audit_log (actor_user_id, category, action, target_type, target_id, details_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.actorUserId,
        entry.category,
        entry.action,
        entry.targetType ?? null,
        entry.targetId ?? null,
        entry.details ? JSON.stringify(entry.details) : null,
      );
  }

  listRecent(limit: number): PlatformAuditEntry[] {
    const rows = this.db
      .prepare(
        `SELECT id, actor_user_id, category, action, target_type, target_id, details_json, created_at
         FROM platform_audit_log ORDER BY id DESC LIMIT ?`,
      )
      .all(Math.max(1, Math.min(limit, 500))) as Array<{
      id: number;
      actor_user_id: number | null;
      category: PlatformAuditCategory;
      action: string;
      target_type: string | null;
      target_id: string | null;
      details_json: string | null;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      category: row.category,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      detailsJson: row.details_json,
      createdAt: row.created_at,
    }));
  }
}

export const platformAuditRepository = new PlatformAuditRepository();
