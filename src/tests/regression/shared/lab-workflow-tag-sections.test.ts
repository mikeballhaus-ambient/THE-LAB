import { describe, expect, test } from '@jest/globals';
import type { LabWorkflowRecord } from '@/shared/types/lab-workflow';
import { buildWorkflowSectionsByPrimaryTag } from '@/shared/utils/lab-workflow-tag-sections';

function wf(
  partial: Pick<LabWorkflowRecord, 'id' | 'name' | 'priority'> & { tags?: string[] },
): LabWorkflowRecord {
  return {
    id: partial.id,
    name: partial.name,
    priority: partial.priority,
    tags: partial.tags,
    scope: 'global',
    ownerUserId: null,
    createdByUserId: 1,
    enabled: true,
    definition: { schemaVersion: 1, trigger: { eventType: 'a.b' }, steps: [{ kind: 'notify_users', userIds: [1] }] },
    createdAt: '',
    updatedAt: '',
  };
}

describe('buildWorkflowSectionsByPrimaryTag', () => {
  test('groups by first tag only', () => {
    const sections = buildWorkflowSectionsByPrimaryTag([
      wf({ id: '1', name: 'B', priority: 10, tags: ['CRM', 'Approvals'] }),
      wf({ id: '2', name: 'A', priority: 5, tags: ['Approvals', 'CRM'] }),
    ]);
    const crm = sections.find((s) => s.label === 'CRM');
    const approvals = sections.find((s) => s.label === 'Approvals');
    expect(crm?.workflows.map((w) => w.id)).toEqual(['1']);
    expect(approvals?.workflows.map((w) => w.id)).toEqual(['2']);
  });
});