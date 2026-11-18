import type {
  LabCommsPartnerKind,
  LabDmChannelSummary,
  LabEnvelope,
  LabUnreadSummary,
} from '@/shared/types/lab-comms';
import { LAB_COMMS_MESSAGE_TYPE_DM_TEXT } from '@/shared/types/lab-comms';
import type { DmChannelId } from '@/shared/types/lab-comms';
import { dmChannelId } from '@/shared/types/schemas/lab-comms-schema';
import {
  LAB_PLATFORM_SYSTEM_USER_EMAIL,
  LAB_PLATFORM_SYSTEM_USER_ID,
  isLabPlatformSystemUserId,
} from '@/shared/config/lab-platform-system-user';
import { Repository } from '../Repository';
import {
  LAB_COMMS_CHANNEL_MEMBERS_TABLE,
  LAB_COMMS_MESSAGES_CHANNEL_INDEX,
  LAB_COMMS_MESSAGES_TABLE,
  LAB_COMMS_READ_CURSORS_TABLE,
  LAB_COMMS_HISTORY_CLEAR_TABLE,
} from './lab-comms-schema';

type MessageRow = {
  id: string;
  channel_id: string;
  type: string;
  sender_user_id: number;
  payload_json: string;
  sent_at: string;
};

function rowToEnvelope(row: MessageRow): LabEnvelope {
  return {
    id: row.id,
    channelId: row.channel_id as LabEnvelope['channelId'],
    type: row.type,
    senderUserId: row.sender_user_id,
    sentAt: row.sent_at,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
  };
}

export class LabCommsRepository extends Repository {
  close(): void {
    /* prepared per call */
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    this.db.exec(LAB_COMMS_MESSAGES_TABLE);
    this.db.exec(LAB_COMMS_MESSAGES_CHANNEL_INDEX);
    this.db.exec(LAB_COMMS_CHANNEL_MEMBERS_TABLE);
    this.db.exec(LAB_COMMS_READ_CURSORS_TABLE);
    this.db.exec(LAB_COMMS_HISTORY_CLEAR_TABLE);
    this.migrateAutomationDmChannelIds();
  }

  /**
   * Rewrites `dm:<user>:<old>` automation channels to `dm:<user>:<new>` when the reserved automation
   * account moves to a different id.
   *
   * ## Why this is guarded so hard
   *
   * A DM channel id embeds both participant ids, so changing the automation account's id orphans every
   * existing workflow thread: the rows still exist, but no client asks for the new channel id and the
   * old one no longer belongs to anyone. A rewrite is only safe when both of these hold:
   *
   * 1. the reserved id being migrated **from** is still the automation account (email match), and
   * 2. no `dm:` channel already uses the target id — otherwise two conversations would be merged, which
   *    is worse than an empty thread because it is unrecoverable.
   *
   * When either check fails the migration does nothing and logs; leaving legacy threads readable under
   * their old id beats silently fusing them.
   */
  private migrateAutomationDmChannelIds(): void {
    const legacyId = this.db
      .prepare(`SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1`)
      .get(LAB_PLATFORM_SYSTEM_USER_EMAIL, LAB_PLATFORM_SYSTEM_USER_ID) as
      | { id: number }
      | undefined;
    if (!legacyId || legacyId.id <= 0) {
      return;
    }

    /*
     * The target id must be *ours* or unoccupied. Checking only for existing DM channels is not enough:
     * on a database created by the old ordering, the reserved id belongs to a demo/human user who simply
     * has no DMs yet. Rewriting into that id would silently re-point every automation thread at a real
     * person's account — worse than the empty-thread bug this migration exists to fix.
     */
    const occupant = this.db
      .prepare(`SELECT email FROM users WHERE id = ?`)
      .get(LAB_PLATFORM_SYSTEM_USER_ID) as { email: string } | undefined;
    if (occupant && occupant.email !== LAB_PLATFORM_SYSTEM_USER_EMAIL) {
      console.warn(
        `[lab-comms] automation channel migration skipped: id ${LAB_PLATFORM_SYSTEM_USER_ID} belongs ` +
          `to "${occupant.email}". Legacy dm:*:${legacyId.id} threads stay under their original ids. ` +
          'Moving the automation account onto an occupied id requires a users-table migration first.',
      );
      return;
    }

    const targetTaken = this.db
      .prepare(
        `SELECT 1 FROM lab_comms_channel_members WHERE user_id = ? AND channel_id LIKE 'dm:%' LIMIT 1`,
      )
      .get(LAB_PLATFORM_SYSTEM_USER_ID);
    if (targetTaken) {
      console.warn(
        `[lab-comms] automation channel migration skipped: id ${LAB_PLATFORM_SYSTEM_USER_ID} already ` +
          `participates in DM channels. Legacy dm:*:${legacyId.id} threads stay readable under their ` +
          'original ids; new automation DMs use the current id.',
      );
      return;
    }

    const suffix = `:${legacyId.id}`;
    const channels = this.db
      .prepare(
        `SELECT channel_id FROM lab_comms_messages
         WHERE channel_id LIKE 'dm:%' AND channel_id LIKE ?`,
      )
      .all(`%${suffix}`) as { channel_id: string }[];
    if (channels.length === 0) {
      return;
    }

    const rewrite = this.db.transaction((rows: { channel_id: string }[]) => {
      let moved = 0;
      for (const { channel_id } of rows) {
        const parsed = /^dm:(\d+):(\d+)$/.exec(channel_id);
        if (!parsed) {
          continue;
        }
        const other = Number(parsed[1]) === legacyId.id ? Number(parsed[2]) : Number(parsed[1]);
        if (!Number.isInteger(other) || other <= 0 || other === legacyId.id) {
          continue;
        }
        const [lo, hi] = other < LAB_PLATFORM_SYSTEM_USER_ID
          ? [other, LAB_PLATFORM_SYSTEM_USER_ID]
          : [LAB_PLATFORM_SYSTEM_USER_ID, other];
        const nextId = `dm:${lo}:${hi}`;
        for (const table of [
          'lab_comms_messages',
          'lab_comms_channel_members',
          'lab_comms_read_cursors',
          'lab_comms_history_clear',
        ]) {
          this.db.prepare(`UPDATE ${table} SET channel_id = ? WHERE channel_id = ?`).run(
            nextId,
            channel_id,
          );
        }
        moved += 1;
      }
      return moved;
    });

    const moved = rewrite(channels);
    if (moved > 0) {
      console.info(
        `[lab-comms] migrated ${moved} automation DM channel(s) from id ${legacyId.id} to ` +
          `${LAB_PLATFORM_SYSTEM_USER_ID}.`,
      );
    }
  }

  getHistoryClearedAt(userId: number, channelId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT cleared_at FROM lab_comms_history_clear WHERE user_id = ? AND channel_id = ?`,
      )
      .get(userId, channelId) as { cleared_at: string } | undefined;
    return row?.cleared_at ?? null;
  }

  latestMessageSentAt(channelId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT sent_at FROM lab_comms_messages WHERE channel_id = ? ORDER BY sent_at DESC LIMIT 1`,
      )
      .get(channelId) as { sent_at: string } | undefined;
    return row?.sent_at ?? null;
  }

  setHistoryCleared(userId: number, channelId: string, clearedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO lab_comms_history_clear (user_id, channel_id, cleared_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, channel_id) DO UPDATE SET cleared_at = excluded.cleared_at`,
      )
      .run(userId, channelId, clearedAt);
  }

  private historyVisibleAfter(userId: number, channelId: string): string {
    return this.getHistoryClearedAt(userId, channelId) ?? '1970-01-01T00:00:00.000Z';
  }

  insertMessage(envelope: LabEnvelope): LabEnvelope {
    this.db
      .prepare(
        `INSERT INTO lab_comms_messages (id, channel_id, type, sender_user_id, payload_json, sent_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        envelope.id,
        envelope.channelId,
        envelope.type,
        envelope.senderUserId,
        JSON.stringify(envelope.payload),
        envelope.sentAt,
      );
    return envelope;
  }

  listMessages(
    channelId: string,
    limit = 50,
    before?: string,
    viewerUserId?: number,
  ): LabEnvelope[] {
    const capped = Math.min(Math.max(limit, 1), 100);
    const afterClear =
      viewerUserId != null ? this.historyVisibleAfter(viewerUserId, channelId) : '1970-01-01T00:00:00.000Z';
    let rows: MessageRow[];
    if (before) {
      rows = this.db
        .prepare(
          `SELECT id, channel_id, type, sender_user_id, payload_json, sent_at
           FROM lab_comms_messages
           WHERE channel_id = ? AND sent_at > ? AND sent_at < ?
           ORDER BY sent_at DESC
           LIMIT ?`,
        )
        .all(channelId, afterClear, before, capped) as MessageRow[];
    } else {
      rows = this.db
        .prepare(
          `SELECT id, channel_id, type, sender_user_id, payload_json, sent_at
           FROM lab_comms_messages
           WHERE channel_id = ? AND sent_at > ?
           ORDER BY sent_at DESC
           LIMIT ?`,
        )
        .all(channelId, afterClear, capped) as MessageRow[];
    }
    return rows.map(rowToEnvelope).reverse();
  }

  ensureDmMembers(channelId: DmChannelId, userIds: [number, number]): void {
    const joinedAt = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO lab_comms_channel_members (channel_id, user_id, joined_at)
       VALUES (?, ?, ?)`,
    );
    for (const userId of userIds) {
      stmt.run(channelId, userId, joinedAt);
    }
  }

  isChannelMember(channelId: string, userId: number): boolean {
    const row = this.db
      .prepare(
        `SELECT 1 FROM lab_comms_channel_members WHERE channel_id = ? AND user_id = ?`,
      )
      .get(channelId, userId);
    return Boolean(row);
  }

  getReadCursor(userId: number, channelId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT last_read_at FROM lab_comms_read_cursors WHERE user_id = ? AND channel_id = ?`,
      )
      .get(userId, channelId) as { last_read_at: string } | undefined;
    return row?.last_read_at ?? null;
  }

  upsertReadCursor(userId: number, channelId: string, lastReadAt: string): void {
    this.db
      .prepare(
        `INSERT INTO lab_comms_read_cursors (user_id, channel_id, last_read_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, channel_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
      )
      .run(userId, channelId, lastReadAt);
  }

  countUnreadInChannel(userId: number, channelId: string): number {
    const afterClear = this.historyVisibleAfter(userId, channelId);
    const lastRead = this.getReadCursor(userId, channelId);
    const readFloor =
      lastRead && lastRead > afterClear ? lastRead : afterClear;
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS c FROM lab_comms_messages
         WHERE channel_id = ? AND sender_user_id != ? AND sent_at > ?`,
      )
      .get(channelId, userId, readFloor) as { c: number };
    return row.c;
  }

  buildUnreadSummary(userId: number): LabUnreadSummary {
    const channels = this.listDmChannelsForUser(userId);
    const byPartnerId: Record<number, number> = {};
    let total = 0;
    for (const ch of channels) {
      if (ch.unreadCount > 0) {
        byPartnerId[ch.partnerUserId] = ch.unreadCount;
        total += ch.unreadCount;
      }
    }
    return { total, byPartnerId };
  }

  /**
   * Whether the counterpart is a person or a platform automation actor.
   *
   * Read from `users.is_system` rather than by comparing ids: the flag is the feature, the id is only an
   * allocation detail. A missing row (e.g. a purged user) degrades to `user` so the UI keeps rendering.
   */
  private partnerKindFor(partnerUserId: number): LabCommsPartnerKind {
    try {
      const row = this.db
        .prepare(`SELECT is_system FROM users WHERE id = ?`)
        .get(partnerUserId) as { is_system?: number } | undefined;
      return row?.is_system === 1 ? 'automation' : 'user';
    } catch {
      // A pre-`is_system` database mid-migration: fall back to the reserved id so the thread still
      // renders read-only instead of flipping to a composer the user cannot use.
      return isLabPlatformSystemUserId(partnerUserId) ? 'automation' : 'user';
    }
  }

  listDmChannelsForUser(userId: number): LabDmChannelSummary[] {
    const memberRows = this.db
      .prepare(
        `SELECT channel_id FROM lab_comms_channel_members WHERE user_id = ? AND channel_id LIKE 'dm:%'`,
      )
      .all(userId) as { channel_id: string }[];

    const summaries: LabDmChannelSummary[] = [];
    for (const { channel_id } of memberRows) {
      const parts = channel_id.split(':');
      if (parts.length !== 3) {
        continue;
      }
      const a = parseInt(parts[1], 10);
      const b = parseInt(parts[2], 10);
      const partnerUserId = a === userId ? b : b === userId ? a : null;
      if (partnerUserId == null) {
        continue;
      }
      const afterClear = this.historyVisibleAfter(userId, channel_id);
      const last = this.db
        .prepare(
          `SELECT payload_json, sent_at, type FROM lab_comms_messages
           WHERE channel_id = ? AND sent_at > ?
           ORDER BY sent_at DESC LIMIT 1`,
        )
        .get(channel_id, afterClear) as
        | { payload_json: string; sent_at: string; type: string }
        | undefined;

      let lastMessagePreview: string | null = null;
      if (last?.type === LAB_COMMS_MESSAGE_TYPE_DM_TEXT) {
        try {
          const payload = JSON.parse(last.payload_json) as { text?: string };
          lastMessagePreview =
            typeof payload.text === 'string' ? payload.text.slice(0, 200) : null;
        } catch {
          lastMessagePreview = null;
        }
      }

      summaries.push({
        channelId: channel_id as DmChannelId,
        partnerUserId,
        partnerKind: this.partnerKindFor(partnerUserId),
        lastMessagePreview,
        lastMessageAt: last?.sent_at ?? null,
        unreadCount: this.countUnreadInChannel(userId, channel_id),
      });
    }

    summaries.sort((x, y) => {
      const ax = x.lastMessageAt ?? '';
      const ay = y.lastMessageAt ?? '';
      return ay.localeCompare(ax);
    });
    return summaries;
  }

  dmChannelForUsers(userA: number, userB: number): DmChannelId {
    return dmChannelId(userA, userB);
  }

  /**
   * Remove lab-comms rows that block deleting a platform user (existing DBs may lack ON DELETE CASCADE).
   * Purges full DM channels the user belonged to so partners do not retain orphaned threads.
   */
  deleteAllDataForUser(userId: number): void {
    const channelRows = this.db
      .prepare(`SELECT channel_id FROM lab_comms_channel_members WHERE user_id = ?`)
      .all(userId) as { channel_id: string }[];

    const purgeChannel = this.db.prepare(`DELETE FROM lab_comms_messages WHERE channel_id = ?`);
    const purgeMembers = this.db.prepare(
      `DELETE FROM lab_comms_channel_members WHERE channel_id = ?`,
    );
    const purgeCursors = this.db.prepare(
      `DELETE FROM lab_comms_read_cursors WHERE channel_id = ?`,
    );
    const purgeClear = this.db.prepare(
      `DELETE FROM lab_comms_history_clear WHERE channel_id = ?`,
    );

    this.db.transaction(() => {
      for (const { channel_id } of channelRows) {
        purgeChannel.run(channel_id);
        purgeMembers.run(channel_id);
        purgeCursors.run(channel_id);
        purgeClear.run(channel_id);
      }
      this.db.prepare(`DELETE FROM lab_comms_messages WHERE sender_user_id = ?`).run(userId);
      this.db.prepare(`DELETE FROM lab_comms_read_cursors WHERE user_id = ?`).run(userId);
      this.db.prepare(`DELETE FROM lab_comms_history_clear WHERE user_id = ?`).run(userId);
      this.db.prepare(`DELETE FROM lab_comms_channel_members WHERE user_id = ?`).run(userId);
    })();
  }
}

export const labCommsRepository = new LabCommsRepository();
