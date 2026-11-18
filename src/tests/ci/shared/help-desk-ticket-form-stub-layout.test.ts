import { describe, expect, test } from '@jest/globals';
import { layoutHelpDeskTicketStubComponents } from '@/shared/lab-integrations/help-desk-ticket-form-stub-layout';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';

describe('layoutHelpDeskTicketStubComponents', () => {
  test('places requester email beside assignee on row 1', () => {
    const components: FormComponent[] = [
      { fieldKey: 'subject', label: 'Subject', type: 'InputText', row: 0, col: 0, span: 1 },
      { fieldKey: 'description', label: 'Description', type: 'InputText', row: 0, col: 1, span: 1 },
      { fieldKey: 'status', label: 'Status', type: 'Select', row: 0, col: 2, span: 1 },
      { fieldKey: 'priority', label: 'Priority', type: 'Select', row: 0, col: 3, span: 1 },
      { fieldKey: 'assigneeId', label: 'Assignee', type: 'Select', row: 1, col: 0, span: 1 },
      {
        fieldKey: 'requesterLabUserId',
        label: 'Requester (lab user)',
        type: 'NumberInput',
        row: 1,
        col: 1,
        span: 1,
        hidden: true,
      },
      { fieldKey: 'requesterEmail', label: 'Requester email', type: 'InputText', row: 1, col: 2, span: 1 },
    ];
    const laidOut = layoutHelpDeskTicketStubComponents(components);
    const assignee = laidOut.find((c) => c.fieldKey === 'assigneeId');
    const email = laidOut.find((c) => c.fieldKey === 'requesterEmail');
    const hiddenRequester = laidOut.find((c) => c.fieldKey === 'requesterLabUserId');
    expect(assignee).toMatchObject({ row: 1, col: 0, span: 1 });
    expect(email).toMatchObject({ row: 1, col: 1 });
    expect(hiddenRequester?.hidden).toBe(true);
    expect(hiddenRequester?.row).toBeGreaterThanOrEqual(50);
  });
});
