import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';
import { DEFAULT_FORM_GRID_COLUMNS } from '@/shared/forms/form-layout';

export const PROJECT_CHARTER_CHARTERS_SERVICE_ID = 'project-charter.charters';

/** Charter create/edit: metadata row, then full-width scope / out-of-scope / goals / stakeholders. */
export function layoutProjectCharterStubComponents(components: FormComponent[]): FormComponent[] {
  const cols = DEFAULT_FORM_GRID_COLUMNS;
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const laidOut: FormComponent[] = [];

  const place = (
    key: string,
    row: number,
    col: number,
    span: number,
    patch?: Partial<FormComponent>,
  ): void => {
    const base = byKey.get(key);
    if (!base) {
      return;
    }
    byKey.delete(key);
    laidOut.push({ ...base, row, col, span, ...patch });
  };

  place('id', 50, 0, 1, { hidden: true });
  place('title', 0, 0, 1);
  place('sponsor', 0, 1, 1);
  place('purpose', 0, 2, 1);
  place('status', 0, 3, 1);
  place('scope', 1, 0, cols, { type: 'Textarea', rowSpan: 3 });
  place('outOfScope', 2, 0, cols, { type: 'Textarea', rowSpan: 3 });
  place('goals', 3, 0, cols, { type: 'Textarea', rowSpan: 3 });
  place('stakeholders', 4, 0, cols, { type: 'MultiSelect' });

  for (const rest of byKey.values()) {
    laidOut.push({ ...rest, row: 5, col: 0, span: 1 });
  }

  return laidOut;
}
