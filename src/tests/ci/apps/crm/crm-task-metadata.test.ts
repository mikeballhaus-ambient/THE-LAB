import { describe, expect, test } from '@jest/globals';
import {
  buildCrmTaskMetadata,
  crmTaskMatchesEntity,
  parseCrmTaskMetadata,
} from '@/apps/lab-crm/shared/types/crm-task-metadata';

describe('crm-task-metadata', () => {
  test('build and parse round-trip', () => {
    const raw = buildCrmTaskMetadata({
      entityKey: 'sales',
      recordId: 7,
      stage: 'proposal',
      recordLabel: 'Deal A',
    });
    const parsed = parseCrmTaskMetadata(raw);
    expect(parsed?.entityKey).toBe('sales');
    expect(parsed?.recordId).toBe(7);
    expect(parsed?.stage).toBe('proposal');
    expect(crmTaskMatchesEntity(raw, 'sales', 7)).toBe(true);
    expect(crmTaskMatchesEntity(raw, 'sales', 8)).toBe(false);
  });
});
