import { describe, expect, test } from '@jest/globals';
import { labWorkflowTagKey, normalizeLabWorkflowTags } from '@/shared/utils/lab-workflow-tags';

describe('lab-workflow-tags', () => {
  test('trims, dedupes case-insensitively, and caps count', () => {
    const tags = normalizeLabWorkflowTags([
      '  CRM  ',
      'crm',
      'Platform',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
    ]);
    expect(tags).toEqual(['CRM', 'Platform', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
  });

  test('labWorkflowTagKey is lowercase', () => {
    expect(labWorkflowTagKey('Time Tracking')).toBe('time tracking');
  });
});