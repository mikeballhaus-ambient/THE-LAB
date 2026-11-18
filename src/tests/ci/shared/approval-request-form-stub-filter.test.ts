import { describe, expect, test } from '@jest/globals';
import {
  filterComponentsForApprovalRequestSlot,
  filterContractForApprovalRequestSlot,
} from '@/shared/lab-integrations/approval-request-form-stub-filter';
import { PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE } from '@/shared/lab-integrations/platform-catalog-integration-services';
import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';

function approvalRequestContractFromDescriptor(): FormsBuilderContract {
  const props = PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE.properties.map((p) => ({ ...p }));
  return {
    appName: 'app-lab-approvals-policies',
    entityName: PLATFORM_LAB_APPROVAL_REQUESTS_SERVICE.entityName,
    capabilities: ['CRUD'],
    entityModel: {
      id: 'string',
      name: 'Approval request',
      description: 'Approval request',
      status: 'active',
      properties: props,
    },
    endpoints: {
      baseUrl: 'http://localhost:3000',
      crud: {
        getAll: { url: '/x', type: 'GET', data: {} },
        get: { url: '/x/:id', type: 'GET', data: {} },
        create: { url: '/x', type: 'POST', data: {} },
        update: { url: '/x/:id', type: 'POST', data: {} },
        delete: { url: '/x/:id', type: 'DELETE', data: {} },
      },
      lookups: [],
    },
  };
}

describe('approval-request-form-stub-filter', () => {
  const baseContract = approvalRequestContractFromDescriptor();

  test('submit slot keeps policy and comments (description) only', () => {
    const filtered = filterContractForApprovalRequestSlot(
      'approval.request.submit.dialog',
      baseContract,
    );
    const names = filtered.entityModel?.properties?.map((p) => p.name) ?? [];
    expect(names).toEqual(['policyId', 'description']);
    const comments = filtered.entityModel?.properties?.find((p) => p.name === 'description');
    expect(comments?.label).toBe('Comments');
    expect(comments?.controlType).toBe('Textarea');
  });

  test('decide slot keeps decision and comment with Select decision', () => {
    const filtered = filterContractForApprovalRequestSlot(
      'crm.approval.request.decide.dialog',
      baseContract,
    );
    const names = filtered.entityModel?.properties?.map((p) => p.name) ?? [];
    expect(names).toEqual(['decision', 'comment']);
    const decision = filtered.entityModel?.properties?.find((p) => p.name === 'decision');
    expect(decision?.controlType).toBe('Select');
    expect(decision?.lookupProvider).toBe('enum');
    expect(decision?.options?.map((o) => o.value)).toEqual(['approve', 'reject']);
  });

  test('filterComponentsForApprovalRequestSlot trims stale full-service stubs', () => {
    const components = [
      { fieldKey: 'policyId', type: 'Select' },
      { fieldKey: 'subjectAppId', type: 'InputText' },
      { fieldKey: 'decision', type: 'InputText' },
    ];
    const submit = filterComponentsForApprovalRequestSlot(
      'approval.request.submit.dialog',
      components,
    );
    expect(submit.map((c) => c.fieldKey)).toEqual(['policyId']);
    expect(submit[0]?.readOnly).toBe(true);
    expect((submit[0] as { span?: number }).span).toBe(2);

    const submitWithComments = filterComponentsForApprovalRequestSlot(
      'approval.request.submit.dialog',
      [
        { fieldKey: 'policyId', type: 'Select' },
        { fieldKey: 'description', type: 'InputText' },
      ],
    );
    expect(submitWithComments.map((c) => c.fieldKey)).toEqual(['policyId', 'description']);
    expect(submitWithComments[1]?.type).toBe('Textarea');
    const commentsField = submitWithComments[1] as { label?: string; span?: number };
    expect(commentsField?.label).toBe('Comments');
    expect(commentsField?.span).toBe(2);

    const decide = filterComponentsForApprovalRequestSlot(
      'crm.approval.request.decide.dialog',
      [{ fieldKey: 'decision', type: 'InputText' }, { fieldKey: 'comment', type: 'Textarea' }],
    );
    expect(decide).toEqual([
      {
        fieldKey: 'decision',
        type: 'Select',
        readOnly: false,
        options: [
          { value: 'approve', label: 'Approve' },
          { value: 'reject', label: 'Reject' },
        ],
        row: 0,
        col: 0,
        span: 2,
        required: true,
        label: 'Decision',
      },
      {
        fieldKey: 'comment',
        type: 'Textarea',
        readOnly: false,
        row: 1,
        col: 0,
        span: 2,
        label: 'Comment',
        required: false,
      },
    ]);
  });
});
