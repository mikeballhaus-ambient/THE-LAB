import { describe, test, expect } from '@jest/globals';
import {
  buildFormActionsBarClasses,
  normalizeFormActionsConfig,
  resolvePrimaryActionLabel,
} from '@/shared/forms/form-actions-config';

describe('form-actions-config', () => {
  test('normalizeFormActionsConfig merges defaults', () => {
    const normalized = normalizeFormActionsConfig({ saveLabel: 'Submit' });
    expect(normalized.saveLabel).toBe('Submit');
    expect(normalized.cancelLabel).toBe('Cancel');
    expect(normalized.primaryButton?.customClasses).toContain('lab-form-action-primary');
  });

  test('resolvePrimaryActionLabel switches for edit mode', () => {
    const config = normalizeFormActionsConfig({});
    expect(resolvePrimaryActionLabel(config, false)).toBe('Save');
    expect(resolvePrimaryActionLabel(config, true)).toBe('Update');
  });

  test('buildFormActionsBarClasses includes alignment and gap', () => {
    const classes = buildFormActionsBarClasses({ barAlign: 'center', barGap: 'gap-4' });
    expect(classes).toContain('justify-center');
    expect(classes).toContain('gap-4');
  });
});
