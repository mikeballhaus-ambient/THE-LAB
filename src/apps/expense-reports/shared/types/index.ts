export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';

export interface ExpenseReport {
  id: number;
  title: string;
  submitter: string;
  /** Platform user id of the submitter (catalog person column, phase 31). */
  submitterId?: number | null;
  /** Integer cents — never a float. */
  amountCents: number;
  currency: string;
  category: string;
  /** ISO date (YYYY-MM-DD). */
  spentOn: string;
  status: ExpenseStatus;
  receiptUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertExpenseInput {
  title: string;
  submitter: string;
  submitterId?: number | null;
  amountCents: number;
  currency: string;
  category: string;
  spentOn: string;
  receiptUrl: string;
  notes: string;
}
