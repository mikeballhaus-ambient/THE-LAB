/**
 * Expense Reports data layer — expense line items with approval status.
 * Ledger/Approvals integration is a follow-on; this MVP owns local status transitions.
 */
import type { Database } from 'better-sqlite3';
import type { ExpenseReport, ExpenseStatus, UpsertExpenseInput } from '../shared/types';

interface ExpenseRow {
  id: number;
  title: string;
  submitter: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  submitter_id?: number | null;
  amount_cents: number;
  currency: string;
  category: string;
  spent_on: string;
  status: string;
  receipt_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function bootstrapExpenseTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      submitter TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      category TEXT NOT NULL DEFAULT '',
      spent_on TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      receipt_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function mapExpense(row: ExpenseRow): ExpenseReport {
  return {
    id: row.id,
    title: row.title,
    submitter: row.submitter,
    submitterId: row.submitter_id ?? null,
    amountCents: row.amount_cents,
    currency: row.currency,
    category: row.category,
    spentOn: row.spent_on,
    status: row.status as ExpenseStatus,
    receiptUrl: row.receipt_url,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ExpenseRepository {
  constructor(private readonly db: Database) {}

  list(): ExpenseReport[] {
    return (
      this.db
        .prepare(`SELECT * FROM expense_reports ORDER BY spent_on DESC, id DESC`)
        .all() as ExpenseRow[]
    ).map(mapExpense);
  }

  /** Totals in cents, keyed by status, for the header summary row. */
  totals(): Record<string, number> {
    const rows = this.db
      .prepare(`SELECT status, COALESCE(SUM(amount_cents), 0) AS total FROM expense_reports GROUP BY status`)
      .all() as { status: string; total: number }[];
    const out: Record<string, number> = {};
    for (const row of rows) out[row.status] = row.total;
    return out;
  }

  create(input: UpsertExpenseInput): ExpenseReport {
    const info = this.db
      .prepare(
        `INSERT INTO expense_reports (title, submitter, submitter_id, amount_cents, currency, category, spent_on, receipt_url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.title.trim(),
        input.submitter.trim(),
        input.submitterId ?? null,
        input.amountCents,
        input.currency,
        input.category.trim(),
        input.spentOn,
        input.receiptUrl.trim(),
        input.notes.trim(),
      );
    return mapExpense(
      this.db.prepare(`SELECT * FROM expense_reports WHERE id = ?`).get(info.lastInsertRowid) as ExpenseRow,
    );
  }

  update(id: number, input: UpsertExpenseInput): ExpenseReport | null {
    if (!this.db.prepare(`SELECT id FROM expense_reports WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE expense_reports SET title = ?, submitter = ?, submitter_id = ?, amount_cents = ?, currency = ?, category = ?, spent_on = ?, receipt_url = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(
        input.title.trim(),
        input.submitter.trim(),
        input.submitterId ?? null,
        input.amountCents,
        input.currency,
        input.category.trim(),
        input.spentOn,
        input.receiptUrl.trim(),
        input.notes.trim(),
        id,
      );
    return mapExpense(this.db.prepare(`SELECT * FROM expense_reports WHERE id = ?`).get(id) as ExpenseRow);
  }

  setStatus(id: number, status: ExpenseStatus): ExpenseReport | null {
    if (!this.db.prepare(`SELECT id FROM expense_reports WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE expense_reports SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, id);
    return mapExpense(this.db.prepare(`SELECT * FROM expense_reports WHERE id = ?`).get(id) as ExpenseRow);
  }

  delete(id: number): boolean {
    return this.db.prepare(`DELETE FROM expense_reports WHERE id = ?`).run(id).changes > 0;
  }
}
