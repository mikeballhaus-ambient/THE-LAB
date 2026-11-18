import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { ExpenseReport, ExpenseStatus, UpsertExpenseInput } from '../shared/types';

export interface ExpenseListResult {
  expenses: ExpenseReport[];
  /** Totals in cents, keyed by status. */
  totals: Record<string, number>;
}

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'EXPENSE', init);
}

export const listExpenses = (base: string): Promise<ExpenseListResult> =>
  request<ExpenseListResult>(base, '/api/expenses');

export const createExpense = (base: string, input: UpsertExpenseInput): Promise<ExpenseReport> =>
  request<{ expense: ExpenseReport }>(base, '/api/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((r) => r.expense);

export const updateExpense = (
  base: string,
  id: number,
  input: UpsertExpenseInput,
): Promise<ExpenseReport> =>
  request<{ expense: ExpenseReport }>(base, `/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }).then((r) => r.expense);

export const setExpenseStatus = (
  base: string,
  id: number,
  status: ExpenseStatus,
): Promise<ExpenseReport> =>
  request<{ expense: ExpenseReport }>(base, `/api/expenses/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then((r) => r.expense);

export const deleteExpense = (base: string, id: number): Promise<void> =>
  request(base, `/api/expenses/${id}`, { method: 'DELETE' }).then(() => undefined);
