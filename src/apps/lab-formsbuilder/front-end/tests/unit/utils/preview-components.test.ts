import { describe, it, expect } from '@jest/globals';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { normalizeComponentsForRuntimePreview } from '@/apps/lab-formsbuilder/front-end/utils/preview-components';

describe('normalizeComponentsForRuntimePreview', () => {
  it('uses definition type when it differs from stored type', () => {
    const components: FormComponent[] = [
      {
        fieldKey: 'cat',
        type: 'RadioButton',
        label: 'Category',
        definition: { type: 'Select' } as FormComponent['definition'],
      },
    ];
    const out = normalizeComponentsForRuntimePreview(components);
    expect(out[0].type).toBe('Select');
  });

  it('leaves type unchanged when definition is absent', () => {
    const a: FormComponent = { fieldKey: 'a', type: 'InputText', label: 'A' };
    expect(normalizeComponentsForRuntimePreview([a])[0].type).toBe('InputText');
  });
});
