import { z } from 'zod';

export const LabLedgerAccountCreateSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(32),
  name: z.string().min(1),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  normalBalance: z.enum(['debit', 'credit']),
  enabled: z.boolean().default(true),
});

export const LabLedgerAccountUpdateSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).optional(),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']).optional(),
  normalBalance: z.enum(['debit', 'credit']).optional(),
  enabled: z.boolean().optional(),
});

export const LabLedgerEntryLineSchema = z.object({
  accountId: z.string().uuid(),
  side: z.enum(['debit', 'credit']),
  amountCents: z.number().int().positive(),
});

export const LabLedgerEntryCreateSchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.string().datetime().optional(),
  memo: z.string().max(500).optional(),
  lines: z.array(LabLedgerEntryLineSchema).min(2).max(20),
});

export function parseLabLedgerAccountCreate(input: unknown) {
  return LabLedgerAccountCreateSchema.parse(input);
}

export function parseLabLedgerAccountUpdate(input: unknown) {
  return LabLedgerAccountUpdateSchema.parse(input);
}

export function parseLabLedgerEntryCreate(input: unknown) {
  return LabLedgerEntryCreateSchema.parse(input);
}
