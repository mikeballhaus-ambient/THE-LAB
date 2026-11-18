import { describe, expect, test } from '@jest/globals';
import { mergeValidationRulesFromComponents } from '@/apps/lab-formsbuilder/front-end/utils/form-validation-sync';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';

describe('mergeValidationRulesFromComponents', () => {
  test('merges rules from component.validation and required flag', () => {
    const components: FormComponent[] = [
      {
        fieldKey: 'status',
        label: 'Status',
        type: 'RadioButton',
        required: true,
        validation: { status: [{ rule: 'required' }] },
      },
      {
        fieldKey: 'title',
        label: 'Title',
        type: 'InputText',
        required: true,
      },
    ];
    expect(mergeValidationRulesFromComponents(components)).toEqual({
      status: [{ rule: 'required' }],
      title: [{ rule: 'required' }],
    });
  });
});
