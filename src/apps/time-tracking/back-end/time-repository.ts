/**
 * Time Tracking data layer — entries + weekly summaries in the app's SQLite DB.
 */
import type { Database } from 'better-sqlite3';
import type {
  TimeEntry,
  TimeEntryStatus,
  TimesheetWeek,
  UpsertTimeEntryInput,
  WeeklySummary,
} from '../shared/types';
import type { TimesheetApprovalStatus } from '../shared/utils/timesheet-approval-status';
import { ensureTextColumn } from '@/shared/server/demo-seed-columns';

interface EntryRow {
  id: number;
  /** Added by the phase-31 person-column migration; NULL for entries logged before it. */
  user_id?: number | null;
  user_name?: string | null;
  project: string;
  task: string;
  date: string;
  minutes: number;
  billable: number;
  notes: string;
  status: string;
  week_key: string;
}

export function bootstrapTimeTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT NOT NULL DEFAULT '',
      task TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT '',
      minutes INTEGER NOT NULL DEFAULT 0,
      billable INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      week_key TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_time_entries_week ON time_entries (week_key);
  `);
  ensureTextColumn(db, 'time_entries', 'user_name', '');
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_week_sheets (
      week_key TEXT PRIMARY KEY,
      approval_status TEXT NOT NULL DEFAULT '',
      requester_user_id INTEGER,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

interface WeekSheetRow {
  week_key: string;
  approval_status: string;
  requester_user_id: number | null;
  submitted_at: string;
}

function mapWeekSheet(row: WeekSheetRow): TimesheetWeek {
  return {
    weekKey: row.week_key,
    approvalStatus: row.approval_status.trim() || null,
    requesterUserId: row.requester_user_id,
    submittedAt: row.submitted_at,
  };
}

function mapEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    userName: row.user_name?.trim() ?? '',
    project: row.project,
    task: row.task,
    date: row.date,
    minutes: row.minutes,
    billable: row.billable === 1,
    notes: row.notes,
    status: row.status as TimeEntryStatus,
    weekKey: row.week_key,
    createdAt: (row as EntryRow & { created_at?: string }).created_at ?? '',
  };
}

/** ISO week key (`YYYY-Www`) for a `YYYY-MM-DD` date. */
function weekKeyFor(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export class TimeRepository {
  constructor(private readonly db: Database) {}

  list(weekKey?: string): TimeEntry[] {
    if (weekKey) {
      return (
        this.db
          .prepare(`SELECT * FROM time_entries WHERE week_key = ? ORDER BY date DESC, id DESC`)
          .all(weekKey) as EntryRow[]
      ).map(mapEntry);
    }
    return (
      this.db
        .prepare(`SELECT * FROM time_entries ORDER BY date DESC, id DESC`)
        .all() as EntryRow[]
    ).map(mapEntry);
  }

  summaries(): WeeklySummary[] {
    const rows = this.db
      .prepare(
        `SELECT e.week_key,
                COALESCE(SUM(e.minutes), 0) AS total,
                COALESCE(SUM(CASE WHEN e.billable = 1 THEN e.minutes ELSE 0 END), 0) AS billable,
                COUNT(*) AS entry_count,
                COALESCE(SUM(CASE WHEN e.status = 'draft' THEN 1 ELSE 0 END), 0) AS draft_count,
                w.approval_status AS approval_status
         FROM time_entries e
         LEFT JOIN time_week_sheets w ON w.week_key = e.week_key
         GROUP BY e.week_key
         ORDER BY e.week_key DESC`,
      )
      .all() as {
      week_key: string;
      total: number;
      billable: number;
      entry_count: number;
      draft_count: number;
      approval_status: string | null;
    }[];
    return rows.map((row) => ({
      weekKey: row.week_key,
      totalMinutes: row.total,
      billableMinutes: row.billable,
      entryCount: row.entry_count,
      submitted: row.draft_count === 0,
      approvalStatus: row.approval_status?.trim() || null,
    }));
  }

  listTimesheets(): TimesheetWeek[] {
    return (
      this.db
        .prepare(`SELECT * FROM time_week_sheets ORDER BY week_key DESC`)
        .all() as WeekSheetRow[]
    ).map(mapWeekSheet);
  }

  getTimesheet(weekKey: string): TimesheetWeek | null {
    const row = this.db
      .prepare(`SELECT * FROM time_week_sheets WHERE week_key = ?`)
      .get(weekKey) as WeekSheetRow | undefined;
    return row ? mapWeekSheet(row) : null;
  }

  deleteTimesheet(weekKey: string): boolean {
    return this.db.prepare(`DELETE FROM time_week_sheets WHERE week_key = ?`).run(weekKey).changes > 0;
  }

  /** Marks pending approval when a week is submitted (subject id for Lab Approvals). */
  markWeekPendingApproval(weekKey: string, requesterUserId: number | null): TimesheetWeek {
    this.db
      .prepare(
        `INSERT INTO time_week_sheets (week_key, approval_status, requester_user_id, submitted_at)
         VALUES (?, 'pending', ?, datetime('now'))
         ON CONFLICT(week_key) DO UPDATE SET
           approval_status = 'pending',
           requester_user_id = excluded.requester_user_id,
           submitted_at = datetime('now')`,
      )
      .run(weekKey, requesterUserId);
    return mapWeekSheet(
      this.db.prepare(`SELECT * FROM time_week_sheets WHERE week_key = ?`).get(weekKey) as WeekSheetRow,
    );
  }

  updateTimesheetApproval(
    weekKey: string,
    approvalStatus: TimesheetApprovalStatus,
  ): TimesheetWeek {
    this.db
      .prepare(
        `INSERT INTO time_week_sheets (week_key, approval_status, requester_user_id, submitted_at)
         VALUES (?, ?, NULL, datetime('now'))
         ON CONFLICT(week_key) DO UPDATE SET approval_status = excluded.approval_status`,
      )
      .run(weekKey, approvalStatus);
    return mapWeekSheet(
      this.db.prepare(`SELECT * FROM time_week_sheets WHERE week_key = ?`).get(weekKey) as WeekSheetRow,
    );
  }

  create(input: UpsertTimeEntryInput): TimeEntry {
    const info = this.db
      .prepare(
        `INSERT INTO time_entries (user_id, user_name, project, task, date, minutes, billable, notes, week_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.userId ?? null,
        (input.userName ?? '').trim(),
        input.project.trim(),
        input.task.trim(),
        input.date,
        input.minutes,
        input.billable ? 1 : 0,
        input.notes.trim(),
        input.weekKey || weekKeyFor(input.date),
      );
    return mapEntry(this.db.prepare(`SELECT * FROM time_entries WHERE id = ?`).get(info.lastInsertRowid) as EntryRow);
  }

  update(id: number, input: UpsertTimeEntryInput): TimeEntry | null {
    if (!this.db.prepare(`SELECT id FROM time_entries WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE time_entries SET user_id = ?, user_name = ?, project = ?, task = ?, date = ?, minutes = ?, billable = ?, notes = ?, week_key = ? WHERE id = ?`,
      )
      .run(
        input.userId ?? null,
        (input.userName ?? '').trim(),
        input.project.trim(),
        input.task.trim(),
        input.date,
        input.minutes,
        input.billable ? 1 : 0,
        input.notes.trim(),
        input.weekKey || weekKeyFor(input.date),
        id,
      );
    return mapEntry(this.db.prepare(`SELECT * FROM time_entries WHERE id = ?`).get(id) as EntryRow);
  }

  /** Marks every draft entry in a week as submitted. Returns rows affected. */
  submitWeek(weekKey: string, requesterUserId: number | null): number {
    const count = this.db
      .prepare(`UPDATE time_entries SET status = 'submitted' WHERE week_key = ? AND status = 'draft'`)
      .run(weekKey).changes;
    if (count > 0) {
      this.markWeekPendingApproval(weekKey, requesterUserId);
    }
    return count;
  }

  delete(id: number): boolean {
    return this.db.prepare(`DELETE FROM time_entries WHERE id = ?`).run(id).changes > 0;
  }
}
