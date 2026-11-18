import { describe, it, expect } from '@jest/globals';
import type { DataConnector, FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { wireComponentToModelProperty } from '@/apps/lab-formsbuilder/front-end/utils/model-property-wiring';

describe('wireComponentToModelProperty', () => {
  const connector: DataConnector = {
    id: 'c1',
    name: 'Test',
    entityModel: {
      properties: [
        { name: 'cat', type: 'string', label: 'Category' },
      ],
    },
    endpoints: {
      lookups: [
        {
          forProperty: 'cat',
          url: '/lookup/cat',
          valueField: 'id',
          labelField: 'name',
        },
      ],
    },
  } as unknown as DataConnector;

  it('keeps Select when wiring a lookup with few options', () => {
    const component: FormComponent = {
      fieldKey: 'field_1',
      type: 'Select',
      label: 'Pick',
    };
    const wired = wireComponentToModelProperty(component, 'cat', connector);
    expect(wired.type).toBe('Select');
    expect(wired.modelProperty).toBe('cat');
    expect(wired.fieldKey).toBe('cat');
  });
});
