import { describe, expect, test } from '@jest/globals';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';

/**
 * Gate G2, schema half, for the platform nodes (W9).
 *
 * The rejection cases are the interesting half. Each is a configuration that would reach a stored
 * workflow and fail at run time in a way the user cannot diagnose:
 *
 * - a delete with no id path deletes nothing, silently;
 * - a ledger entry with one line cannot balance, so it can never post;
 * - an unconfirmed ledger entry is a money movement nobody authorised.
 */

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
const POLICY = '33333333-3333-4333-8333-333333333333';

describe('platform node schema (W9)', () => {
  test.each([
    [
      'lab_query_app listing',
      { kind: 'lab_query_app', providerAppId: 'app-lab-crm', serviceId: 'records' },
    ],
    [
      'lab_query_app by id',
      {
        kind: 'lab_query_app',
        providerAppId: 'app-lab-crm',
        serviceId: 'records',
        recordIdPath: 'recordId',
      },
    ],
    [
      'integration_delete',
      {
        kind: 'integration_delete',
        providerAppId: 'app-lab-crm',
        serviceId: 'records',
        recordIdPath: 'recordId',
      },
    ],
    [
      'raise_approval',
      { kind: 'raise_approval', policyId: POLICY, title: 'Approve the invoice' },
    ],
    [
      'ledger_post_entry',
      {
        kind: 'ledger_post_entry',
        memo: 'Invoice paid',
        lines: [
          { accountId: ACCOUNT_A, side: 'debit', amountCentsPath: 'amount' },
          { accountId: ACCOUNT_B, side: 'credit', amountCentsPath: 'amount' },
        ],
        confirmedByUserId: 1,
      },
    ],
    ['virtual_bank_get_wallet', { kind: 'virtual_bank_get_wallet', userIdPath: 'userId' }],
    [
      'virtual_bank_credit_daily_allotment',
      { kind: 'virtual_bank_credit_daily_allotment', userIdPath: 'userId' },
    ],
    [
      'show_user_toast',
      {
        kind: 'show_user_toast',
        userIdPath: 'userId',
        severity: 'success',
        summary: 'Hello',
      },
    ],
  ])('accepts %s', (_name, step) => {
    expect(LabWorkflowStepSchema.safeParse(step).success).toBe(true);
  });

  test.each([
    [
      'a delete with no id path',
      { kind: 'integration_delete', providerAppId: 'app-lab-crm', serviceId: 'records' },
    ],
    [
      'a delete with an empty id path',
      {
        kind: 'integration_delete',
        providerAppId: 'app-lab-crm',
        serviceId: 'records',
        recordIdPath: '',
      },
    ],
    [
      'a query with no service',
      { kind: 'lab_query_app', providerAppId: 'app-lab-crm', serviceId: '' },
    ],
    [
      'an approval with a non-uuid policy',
      { kind: 'raise_approval', policyId: 'policy-1', title: 'Approve' },
    ],
    [
      'an approval with no title',
      { kind: 'raise_approval', policyId: POLICY, title: '' },
    ],
    [
      'a ledger entry with one line',
      {
        kind: 'ledger_post_entry',
        memo: 'One-sided',
        lines: [{ accountId: ACCOUNT_A, side: 'debit', amountCentsPath: 'amount' }],
        confirmedByUserId: 1,
      },
    ],
    [
      'a ledger entry with no confirming user',
      {
        kind: 'ledger_post_entry',
        memo: 'Unauthorised',
        lines: [
          { accountId: ACCOUNT_A, side: 'debit', amountCentsPath: 'amount' },
          { accountId: ACCOUNT_B, side: 'credit', amountCentsPath: 'amount' },
        ],
      },
    ],
    [
      'a ledger entry with an invalid side',
      {
        kind: 'ledger_post_entry',
        memo: 'Typo',
        lines: [
          { accountId: ACCOUNT_A, side: 'debit', amountCentsPath: 'amount' },
          { accountId: ACCOUNT_B, side: 'creddit', amountCentsPath: 'amount' },
        ],
        confirmedByUserId: 1,
      },
    ],
  ])('rejects %s', (_name, step) => {
    expect(LabWorkflowStepSchema.safeParse(step).success).toBe(false);
  });
});
