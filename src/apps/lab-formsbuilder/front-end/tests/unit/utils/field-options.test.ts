import { describe, expect, test } from '@jest/globals';
import {
  buildFieldOptionsFromRows,
  optionRowsFromComponent,
  supportsManualFieldOptions,
} from '@/apps/lab-formsbuilder/front-end/utils/field-options';

describe('field-options', () => {
  test('supportsManualFieldOptions', () => {
    expect(supportsManualFieldOptions('Select')).toBe(true);
    expect(supportsManualFieldOptions('RadioButton')).toBe(true);
    expect(supportsManualFieldOptions('MultiSelect')).toBe(true);
  });

  test('optionRowsFromComponent defaults when empty', () => {
    expect(optionRowsFromComponent()).toEqual([{ label: 'Option 1', value: 'option-1' }]);
  });

  test('buildFieldOptionsFromRows trims and fills blanks', () => {
    expect(
      buildFieldOptionsFromRows([
        { label: ' Yes ', value: '' },
        { label: '', value: 'no' },
      ]),
    ).toEqual([
      { label: 'Yes', value: 'option-1' },
      { label: 'Option 2', value: 'no' },
    ]);
  });
});
