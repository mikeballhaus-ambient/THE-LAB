import { buildDemoExpenseApprovedLedgerWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-expense-ledger';
import { collectWorkflowRequiredAppRefs } from '@/shared/utils/lab-workflow-required-apps';

describe('collectWorkflowRequiredAppRefs', () => {
  test('expense approved ledger demo lists approval publisher and ledger connector', () => {
    const definition = buildDemoExpenseApprovedLedgerWorkflowDefinition();
    const refs = collectWorkflowRequiredAppRefs(definition, [
      {
        eventType: 'platform-approvals.request.approved',
        sourceAppId: 'platform-approvals',
        label: 'Approval request approved',
        description: '',
        payloadFields: [],
        publisherKind: 'platform',
      },
    ]);

    const byId = new Map(refs.map((ref) => [ref.appId, ref]));
    expect(byId.has('app-lab-approvals-policies')).toBe(true);
    expect(byId.get('app-lab-approvals-policies')?.roles).toContain('event_publisher');
    expect(byId.has('app-lab-financial-ledger')).toBe(true);
    expect(byId.get('app-lab-financial-ledger')?.roles).toContain('integration_provider');
  });
});
