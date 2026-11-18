import { describe, expect, test } from '@jest/globals';
import {
  appendLabUserDisplayNameToSystemMessage,
  formatLabUserDisplayNameSystemAppendix,
} from '@/shared/composables/lab-user-display-name-system-prompt';

describe('lab-user-display-name-system-prompt', () => {
  test('appendix includes name and sparing-use guidance', () => {
    const block = formatLabUserDisplayNameSystemAppendix('Alex');
    expect(block).toContain('**Alex**');
    expect(block).toContain('not in every reply');
    expect(block).toContain('do **not** repeat their display name');
  });

  test('append skips empty names', () => {
    expect(appendLabUserDisplayNameToSystemMessage('base', '')).toBe('base');
    expect(appendLabUserDisplayNameToSystemMessage('base', '  ')).toBe('base');
  });

  test('append adds block when name set', () => {
    const out = appendLabUserDisplayNameToSystemMessage('sys', 'Jordan');
    expect(out.startsWith('sys')).toBe(true);
    expect(out).toContain('Jordan');
  });
});
