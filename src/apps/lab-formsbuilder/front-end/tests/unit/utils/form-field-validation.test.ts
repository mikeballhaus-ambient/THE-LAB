import { describe, expect, test } from '@jest/globals';
import {
  isFieldRequired,
  validateFieldValue,
  validateFormFields,
} from '@/shared/forms/form-field-validation';

describe('form-field-validation', () => {
  test('isFieldRequired reads required flag and validation rules', () => {
    expect(isFieldRequired({ fieldKey: 'a', required: true })).toBe(true);
    expect(
      isFieldRequired({
        fieldKey: 'b',
        validation: { b: [{ rule: 'required' }] },
      }),
    ).toBe(true);
    expect(isFieldRequired({ fieldKey: 'c' })).toBe(false);
  });

  test('validateFieldValue fails empty required radio/select values', () => {
    expect(
      validateFieldValue(
        { fieldKey: 'status', type: 'RadioButton', value: undefined },
        [{ rule: 'required' }],
      ).valid,
    ).toBe(false);
    expect(
      validateFieldValue(
        { fieldKey: 'status', type: 'RadioButton', value: 'active' },
        [{ rule: 'required' }],
      ).valid,
    ).toBe(true);
  });

  test('validateFormFields collects invalid keys', () => {
    const result = validateFormFields([
      { fieldKey: 'title', type: 'InputText', label: 'Title', required: true, value: '' },
      {
        fieldKey: 'status',
        type: 'RadioButton',
        label: 'Status',
        validation: { status: [{ rule: 'required' }] },
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.invalidFieldKeys).toEqual(['title', 'status']);
    expect(result.fieldErrors).toEqual([
      { fieldKey: 'title', label: 'Title', message: 'is required.' },
      { fieldKey: 'status', label: 'Status', message: 'is required.' },
    ]);
  });

  test('validateFormFields uses form-level validationRules when component rules are missing', () => {
    const result = validateFormFields(
      [{ fieldKey: 'status', type: 'RadioButton' }],
      {},
      { status: [{ rule: 'required' }] },
    );
    expect(result.valid).toBe(false);
    expect(result.invalidFieldKeys).toEqual(['status']);
  });
});
