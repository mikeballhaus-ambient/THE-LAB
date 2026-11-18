export type TimeEntryStatus = 'draft' | 'submitted';

export interface TimeEntry {
  id: number;
  /** Platform user id of the person who logged the entry (phase 31). */
  userId?: number | null;
  /** Denormalized display name for lists and charts. */
  userName?: string;
  project: string;
  task: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  minutes: number;
  billable: boolean;
  notes: string;
  status: TimeEntryStatus;
  /** ISO week key, e.g. `2026-W42`. */
  weekKey: string;
  createdAt: string;
}

export interface UpsertTimeEntryInput {
  userId?: number | null;
  userName?: string;
  project: string;
  task: string;
  date: string;
  minutes: number;
  billable: boolean;
  notes: string;
  weekKey: string;
}

export interface WeeklySummary {
  weekKey: string;
  totalMinutes: number;
  billableMinutes: number;
  entryCount: number;
  submitted: boolean;
  /** Set when the week was submitted for manager approval (workflow write-back). */
  approvalStatus?: string | null;
}

export interface TimesheetWeek {
  weekKey: string;
  approvalStatus: string | null;
  requesterUserId: number | null;
  submittedAt: string;
}
