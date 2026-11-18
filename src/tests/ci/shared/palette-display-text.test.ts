import {
  looksLikeTechnicalPaletteId,
  paletteCardSubtext,
  resolveLabDomainEventLabel,
} from '@/shared/utils/palette-display-text';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';

const approvalCatalog: LabDomainEventCatalogEntry[] = [
  {
    eventType: 'platform-approvals.request.approved',
    sourceAppId: 'app-lab-approvals-policies',
    label: 'Approval request approved',
    description: '',
    publisherKind: 'platform',
    payloadFields: [],
  },
  {
    eventType: 'platform-approvals.request.rejected',
    sourceAppId: 'app-lab-approvals-policies',
    label: 'Approval request rejected',
    description: '',
    publisherKind: 'platform',
    payloadFields: [],
  },
];

describe('palette-display-text', () => {
  test('looksLikeTechnicalPaletteId', () => {
    expect(looksLikeTechnicalPaletteId('crm.quotes')).toBe(true);
    expect(looksLikeTechnicalPaletteId('app-lab-tasklist.task.created')).toBe(true);
    expect(looksLikeTechnicalPaletteId('(pack:phase2-platform-demo)')).toBe(true);
    expect(looksLikeTechnicalPaletteId('Runs when a task is created')).toBe(false);
  });

  test('paletteCardSubtext filters ids and duplicates', () => {
    expect(paletteCardSubtext('Tasks', 'task-list.tasks')).toBeUndefined();
    expect(paletteCardSubtext('Tasks', 'Open tasks in Task List')).toBe('Open tasks in Task List');
    expect(paletteCardSubtext('Foo', 'Foo')).toBeUndefined();
  });

  test('resolveLabDomainEventLabel names wildcard approval outcome triggers', () => {
    expect(
      resolveLabDomainEventLabel('platform-approvals.request.*', approvalCatalog),
    ).toBe('Approval request outcome');
    expect(resolveLabDomainEventLabel('platform-approvals.request.approved', approvalCatalog)).toBe(
      'Approval request approved',
    );
  });
});
