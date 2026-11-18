import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';

export const TASK_LIST_TASK_LISTS_SERVICE_ID = 'task-list.task-lists';

/** Task list create/edit: name (1 col) + description (3 cols) on one row. */
export function layoutTaskListStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const descriptionSpan = Math.min(3, cols - 1);
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];

  const name = byKey.get('name');
  if (name) {
    laidOut.push({ ...name, row: 0, col: 0, span: 1 });
    byKey.delete('name');
  }

  const description = byKey.get('description');
  if (description) {
    laidOut.push({
      ...description,
      row: 0,
      col: 1,
      span: descriptionSpan,
      type: description.type === 'InputText' ? 'Textarea' : description.type,
    });
    byKey.delete('description');
  }

  let row = 1;
  for (const rest of byKey.values()) {
    laidOut.push({ ...rest, row, col: 0, span: 1 });
    row += 1;
  }

  return laidOut;
}
