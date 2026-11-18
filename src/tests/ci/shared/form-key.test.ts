import { describe, expect, test } from '@jest/globals';
import { isValidFormKey } from '@/shared/forms/form-key';

describe('form-key', () => {
  test('accepts rm-64 dotted stub keys', () => {
    expect(isValidFormKey('task-list.task-list.tasks.task-create-dialog')).toBe(true);
  });

  test('accepts legacy underscore keys', () => {
    expect(isValidFormKey('task-create-form')).toBe(true);
  });

  test('rejects spaces and slashes', () => {
    expect(isValidFormKey('bad key')).toBe(false);
    expect(isValidFormKey('bad/key')).toBe(false);
  });
});
