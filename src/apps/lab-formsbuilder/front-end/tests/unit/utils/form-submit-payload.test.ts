import { describe, test, expect } from '@jest/globals';
import {
  buildFormSubmitPayload,
  coerceRecordValueForField,
  mapRecordToFieldValues,
  parseDateFieldValue,
} from '@/shared/forms/form-submit-payload';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';

describe('form-submit-payload', () => {
  test('buildFormSubmitPayload maps modelProperty and skips containers', () => {
    const fields: IFormRuntimeField[] = [
      { fieldKey: 'title', type: 'InputText', modelProperty: 'title', value: 'A' },
      { fieldKey: 'static', type: 'Label', value: 'x' },
      { fieldKey: 'grp', type: 'Group', value: null },
    ];
    const payload = buildFormSubmitPayload(fields, { title: 'Hello' });
    expect(payload).toEqual({ title: 'Hello' });
  });

  test('mapRecordToFieldValues maps connector record to field keys', () => {
    const fields: IFormRuntimeField[] = [
      { fieldKey: 'f_title', type: 'InputText', modelProperty: 'title' },
      { fieldKey: 'f_qty', type: 'NumberInput', modelProperty: 'qty' },
    ];
    const values = mapRecordToFieldValues(fields, { title: 'T', qty: 2, id: '1' });
    expect(values).toEqual({ f_title: 'T', f_qty: 2 });
  });

  test('mapRecordToFieldValues coerces connector task fields for runtime controls', () => {
    const fields: IFormRuntimeField[] = [
      { fieldKey: 'dueDate', type: 'DatePicker' },
      { fieldKey: 'assigneeId', type: 'Select' },
      { fieldKey: 'tags', type: 'MultiSelect' },
    ];
    const values = mapRecordToFieldValues(fields, {
      dueDate: '2026-10-14',
      assigneeId: 3,
      tags: ['feature'],
    });
    expect(values.dueDate).toBeInstanceOf(Date);
    expect(values.assigneeId).toBe('3');
    expect(values.tags).toEqual(['feature']);
    expect(parseDateFieldValue('2026-10-14')?.getDate()).toBe(14);
  });

  test('buildFormSubmitPayload serializes DatePicker to local datetime by default', () => {
    const fields: IFormRuntimeField[] = [
      { fieldKey: 'startsAt', type: 'DatePicker', modelProperty: 'startsAt' },
    ];
    const payload = buildFormSubmitPayload(fields, {
      startsAt: new Date(2026, 9, 15, 9, 30, 0),
    });
    expect(payload.startsAt).toBe('2026-10-15T09:30:00');
  });

  test('buildFormSubmitPayload serializes dateOnly DatePicker to YYYY-MM-DD', () => {
    const fields: IFormRuntimeField[] = [
      { fieldKey: 'dueDate', type: 'DatePicker', modelProperty: 'dueDate', dateOnly: true },
    ];
    const payload = buildFormSubmitPayload(fields, {
      dueDate: new Date(2026, 9, 15),
    });
    expect(payload.dueDate).toBe('2026-10-15');
  });

  test('coerceRecordValueForField leaves text fields unchanged', () => {
    expect(coerceRecordValueForField({ fieldKey: 'title', type: 'InputText' }, 'x')).toBe('x');
  });

  test('mapRecordToFieldValues prefers submitterId for lab-user Select', () => {
    const fields: IFormRuntimeField[] = [
      {
        fieldKey: 'submitter',
        type: 'Select',
        modelProperty: 'submitter',
        dataFetch: { forProperty: 'submitter', endpoint: { url: '/api/platform/users/lookup' } },
      },
    ];
    const values = mapRecordToFieldValues(fields, {
      submitter: 'Sam Patel',
      submitterId: 5,
    });
    expect(values.submitter).toBe('5');
  });

  test('mapRecordToFieldValues maps enum label to option value', () => {
    const fields: IFormRuntimeField[] = [
      {
        fieldKey: 'category',
        type: 'Select',
        modelProperty: 'category',
        options: [
          { value: 'travel', label: 'Travel' },
          { value: 'other', label: 'Other' },
        ],
      },
    ];
    const travel = mapRecordToFieldValues(fields, { category: 'Travel' });
    expect(travel.category).toBe('travel');
    const normalized = mapRecordToFieldValues(fields, { category: 'other' });
    expect(normalized.category).toBe('other');
  });
});
