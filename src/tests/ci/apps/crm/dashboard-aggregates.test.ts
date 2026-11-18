import { describe, expect, test } from '@jest/globals';
import {
  countRecordsByEnumField,
  pipelineByStage,
  sumNumericField,
} from '@/apps/lab-crm/shared/utils/dashboard-aggregates';

describe('dashboard-aggregates', () => {
  test('countRecordsByEnumField groups flat connector rows', () => {
    const segments = countRecordsByEnumField(
      [
        { id: 1, stage: 'proposal' },
        { id: 2, stage: 'proposal' },
        { id: 3, stage: 'closed-won' },
      ],
      'stage',
      { proposal: 'Proposal', 'closed-won': 'Closed won' },
    );
    expect(segments.find(s => s.key === 'proposal')?.value).toBe(2);
    expect(segments.find(s => s.key === 'closed-won')?.value).toBe(1);
  });

  test('sumNumericField and pipelineByStage', () => {
    const rows = [
      { id: 1, stage: 'proposal', amount: 1000 },
      { id: 2, stage: 'proposal', amount: 500 },
    ];
    expect(sumNumericField(rows, 'amount')).toBe(1500);
    const pipeline = pipelineByStage(rows);
    expect(pipeline[0]?.value).toBe(1500);
  });
});
