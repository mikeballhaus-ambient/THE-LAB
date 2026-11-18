import type { FormComponent } from '@/apps/lab-formsbuilder/shared/types';

/** Stack kanban board fields for inline manage modal (matches ticket dialog density). */
export function layoutKanbanBoardStubComponents(components: FormComponent[]): FormComponent[] {
  const byKey = new Map(components.map((c) => [c.fieldKey, c]));
  const name = byKey.get('name');
  const fieldKey = byKey.get('fieldKey');
  const columnsJson = byKey.get('columnsJson');
  const rest = components.filter(
    (c) => c.fieldKey !== 'name' && c.fieldKey !== 'fieldKey' && c.fieldKey !== 'columnsJson',
  );

  const laidOut: FormComponent[] = [];
  if (name) {
    laidOut.push({ ...name, row: 0, col: 0, span: 2, rowSpan: 1 });
  }
  if (fieldKey) {
    laidOut.push({ ...fieldKey, row: 0, col: 2, span: 2, rowSpan: 1 });
  }
  if (columnsJson) {
    laidOut.push({
      ...columnsJson,
      type:
        columnsJson.type === 'LabKanbanBoardColumns'
          ? columnsJson.type
          : 'LabKanbanBoardColumns',
      row: 1,
      col: 0,
      span: 4,
      rowSpan: 2,
    });
  }
  return [...laidOut, ...rest];
}
