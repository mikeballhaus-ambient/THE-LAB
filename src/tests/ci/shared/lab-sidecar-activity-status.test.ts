import { describe, expect, test } from '@jest/globals';
import {
  getLabSidecarActivityPhase,
  pickLabSidecarWorkingLabel,
  turnHasToolActivity,
} from '@/shared/composables/lab-sidecar/lab-sidecar-activity-status';
import type { UIChatMessage } from '@/shared/types';

describe('lab-sidecar-activity-status', () => {
  test('thinking before any tool system rows', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'launch crm' },
      { role: 'assistant', content: '', isPlaceholder: true },
    ];
    expect(getLabSidecarActivityPhase(messages, true)).toBe('thinking');
  });

  test('working when tool system logs exist in current turn', () => {
    const messages: UIChatMessage[] = [
      { role: 'user', content: 'launch crm' },
      {
        role: 'system',
        content: '',
        systemLog: { id: '1', data: {}, title: 'ui_automation_discover_elements', content: '{}', isResult: false },
      },
    ];
    expect(turnHasToolActivity(messages.slice(1))).toBe(true);
    expect(getLabSidecarActivityPhase(messages, true)).toBe('working');
  });

  test('idle when not awaiting', () => {
    expect(getLabSidecarActivityPhase([], false)).toBe('idle');
  });

  test('pickLabSidecarWorkingLabel wraps index', () => {
    expect(pickLabSidecarWorkingLabel(0)).toContain('flask');
    expect(pickLabSidecarWorkingLabel(999)).toBeTruthy();
  });
});
