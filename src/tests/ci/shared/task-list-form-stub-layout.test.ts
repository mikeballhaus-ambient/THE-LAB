import { describe, expect, test } from '@jest/globals';
import { layoutTaskListStubComponents } from '@/shared/lab-integrations/task-list-form-stub-layout';
import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';

describe('layoutTaskListStubComponents', () => {
  test('places description at span 3 beside name on row 0', () => {
    const components: FormComponent[] = [
      { fieldKey: 'id', label: 'ID', type: 'InputText', row: 0, col: 0, span: 1, hidden: true },
      { fieldKey: 'name', label: 'Name', type: 'InputText', row: 0, col: 0, span: 1 },
      { fieldKey: 'description', label: 'Description', type: 'InputText', row: 0, col: 1, span: 1 },
    ];
    const laidOut = layoutTaskListStubComponents(components);
    const name = laidOut.find((c) => c.fieldKey === 'name');
    const description = laidOut.find((c) => c.fieldKey === 'description');
    expect(name).toMatchObject({ row: 0, col: 0, span: 1 });
    expect(description).toMatchObject({ row: 0, col: 1, span: 3, type: 'Textarea' });
  });
});
