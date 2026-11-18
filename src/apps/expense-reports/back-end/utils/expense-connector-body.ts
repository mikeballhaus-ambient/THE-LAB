import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { labUserFieldSchema, resolveLabUserFieldValue } from '@/shared/server/lab-user-field-input';
import { demoCastByName } from '@/shared/config/demo-data-cast';
import type { ExpenseReport, UpsertExpenseInput } from '../../shared/types';

/** Must stay aligned with `EXPENSE_CATEGORIES` in `catalog-manifests.ts`. */
export const EXPENSE_CATEGORY_ENUM_VALUES = [
  'travel',
  'meals',
  'supplies',
  'software',
  'other',
] as const;

const DISPLAY_TO_ENUM: Record<string, (typeof EXPENSE_CATEGORY_ENUM_VALUES)[number]> = {
  travel: 'travel',
  Travel: 'travel',
  Lodging: 'travel',
  meals: 'meals',
  Meals: 'meals',
  supplies: 'supplies',
  Supplies: 'supplies',
  Hardware: 'supplies',
  software: 'software',
  Software: 'software',
  other: 'other',
  Events: 'other',
  Learning: 'other',
};

const ExpenseConnectorBodySchema = z.object({
  title: z.string().min(1),
  submitter: labUserFieldSchema.or(z.string()).optional(),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().optional(),
  category: z.string().optional(),
  spentOn: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

/** Forms Builder lab-user Select option values are platform user ids, not display names. */
export function submitterValueForConnector(
  expense: Pick<ExpenseReport, 'submitter' | 'submitterId'>,
): string {
  if (expense.submitterId != null && expense.submitterId > 0) {
    return String(expense.submitterId);
  }
  const name = expense.submitter?.trim() ?? '';
  if (!name) {
    return '';
  }
  const member = demoCastByName(name);
  if (member) {
    return String(member.id);
  }
  return name;
}

/** Enum Select hydrates from manifest `value` strings, not legacy Title Case labels in demo rows. */
export function categoryValueForConnector(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return '';
  }
  const mapped = DISPLAY_TO_ENUM[trimmed];
  if (mapped) {
    return mapped;
  }
  const lower = trimmed.toLowerCase();
  if ((EXPENSE_CATEGORY_ENUM_VALUES as readonly string[]).includes(lower)) {
    return lower;
  }
  return 'other';
}

export async function parseExpenseConnectorBody(
  body: Record<string, unknown>,
  request?: FastifyRequest,
): Promise<UpsertExpenseInput> {
  const parsed = ExpenseConnectorBodySchema.parse(body);
  const actorUserId = request ? resolveLabAppActorUserId(request) : 0;
  const submitter = await resolveLabUserFieldValue(parsed.submitter, actorUserId, {
    fieldName: 'submitter',
  });

  return {
    title: parsed.title,
    submitter: submitter.name,
    submitterId: submitter.userId ?? null,
    amountCents: parsed.amountCents,
    currency: parsed.currency?.trim() || 'USD',
    category: categoryValueForConnector(parsed.category),
    spentOn: parsed.spentOn?.trim() ?? '',
    receiptUrl: parsed.receiptUrl?.trim() ?? '',
    notes: parsed.notes?.trim() ?? '',
  };
}

const EXPENSE_STATUS_VALUES = ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'] as const;

/** Workflow `integration_update` often sends `{ status }` only — do not require full expense body. */
export function parseExpenseConnectorStatusUpdate(
  body: Record<string, unknown>,
): (typeof EXPENSE_STATUS_VALUES)[number] | null {
  const raw = body.status;
  if (!(EXPENSE_STATUS_VALUES as readonly string[]).includes(String(raw))) {
    return null;
  }
  const hasFullBody =
    body.title !== undefined &&
    typeof body.title === 'string' &&
    String(body.title).trim().length > 0;
  if (hasFullBody) {
    return null;
  }
  return raw as (typeof EXPENSE_STATUS_VALUES)[number];
}
