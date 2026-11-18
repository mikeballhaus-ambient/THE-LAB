import { layoutKanbanBoardStubComponents } from '@/shared/lab-integrations/kanban-board-form-stub-layout';

describe('layoutKanbanBoardStubComponents', () => {
  test('stacks name, fieldKey, and columnsJson on a 4-column grid', () => {
    const laidOut = layoutKanbanBoardStubComponents([
      { fieldKey: 'name', label: 'Board name', type: 'InputText', row: 0, col: 0, span: 1 },
      { fieldKey: 'fieldKey', label: 'Group by', type: 'InputText', row: 0, col: 1, span: 1 },
      { fieldKey: 'columnsJson', label: 'Columns', type: 'InputText', row: 0, col: 2, span: 1 },
    ]);

    expect(laidOut.find((c) => c.fieldKey === 'name')?.span).toBe(2);
    expect(laidOut.find((c) => c.fieldKey === 'fieldKey')?.col).toBe(2);
    expect(laidOut.find((c) => c.fieldKey === 'columnsJson')?.type).toBe('LabKanbanBoardColumns');
    expect(laidOut.find((c) => c.fieldKey === 'columnsJson')?.span).toBe(4);
  });
});
