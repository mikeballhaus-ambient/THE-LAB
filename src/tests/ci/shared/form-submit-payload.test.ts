import { describe, expect, test } from '@jest/globals';
import {
  buildFormSubmitPayload,
  coerceRecordValueForField,
  mapRecordToFieldValues,
} from '@/shared/forms/form-submit-payload';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';

describe('form-submit-payload usd-cents', () => {
  const amountField: IFormRuntimeField = {
    fieldKey: 'amountCents',
    type: 'NumberInput',
    modelProperty: 'amountCents',
    numberScale: 'usd-cents',
  };

  test('loads connector cents as dollars for the form', () => {
    const values = mapRecordToFieldValues([amountField], { amountCents: 198_000 });
    expect(values.amountCents).toBe(1980);
  });

  test('submits dollars as integer cents', () => {
    const payload = buildFormSubmitPayload([amountField], { amountCents: 1980.5 });
    expect(payload.amountCents).toBe(198_050);
  });

  test('coerceRecordValueForField divides cents', () => {
    expect(coerceRecordValueForField(amountField, 1999)).toBe(19.99);
  });
});

describe('form-submit-payload DatePicker serialization', () => {
  test('default DatePicker serializes local datetime', () => {
    const fields: IFormRuntimeField[] = [
      { fieldKey: 'startsAt', type: 'DatePicker', modelProperty: 'startsAt' },
    ];
    const payload = buildFormSubmitPayload(fields, {
      startsAt: new Date(2026, 9, 15, 9, 30, 0),
    });
    expect(payload.startsAt).toBe('2026-10-15T09:30:00');
  });

  test('dateOnly DatePicker serializes YYYY-MM-DD', () => {
    const fields: IFormRuntimeField[] = [
      { fieldKey: 'dueDate', type: 'DatePicker', modelProperty: 'dueDate', dateOnly: true },
    ];
    const payload = buildFormSubmitPayload(fields, {
      dueDate: new Date(2026, 9, 15),
    });
    expect(payload.dueDate).toBe('2026-10-15');
  });
});
