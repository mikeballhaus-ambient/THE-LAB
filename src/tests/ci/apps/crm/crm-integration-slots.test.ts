import {
  parseCrmEntityRecordDialogSlot,
  crmEntityEditSlot,
} from '@/apps/lab-crm/shared/constants/crm-integration-slots';

describe('parseCrmEntityRecordDialogSlot', () => {
  test('parses entity edit/create/delete slots', () => {
    expect(parseCrmEntityRecordDialogSlot(crmEntityEditSlot('partners'))).toEqual({
      entityKey: 'partners',
      mode: 'edit',
    });
    expect(parseCrmEntityRecordDialogSlot('crm.leads.create.dialog')).toEqual({
      entityKey: 'leads',
      mode: 'create',
    });
  });

  test('ignores task and ticket integration slots', () => {
    expect(parseCrmEntityRecordDialogSlot('crm.task.edit.dialog')).toBeNull();
    expect(parseCrmEntityRecordDialogSlot('crm.ticket.create.dialog')).toBeNull();
  });
});
