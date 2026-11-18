import { controlTypeForProperty } from '@/shared/forms/build-components-from-connector';

describe('controlTypeForProperty', () => {
  test('uses contract controlType when set', () => {
    expect(
      controlTypeForProperty(
        { name: 'approvalSteps', type: 'string', controlType: 'LabApprovalPolicySteps' },
        undefined,
      ),
    ).toBe('LabApprovalPolicySteps');
  });

  test('maps definitionJson to LabCollapsibleJson', () => {
    expect(
      controlTypeForProperty({ name: 'definitionJson', type: 'string', label: 'Definition (JSON)' }, undefined),
    ).toBe('LabCollapsibleJson');
  });

  test('maps columnsJson to LabKanbanBoardColumns', () => {
    expect(controlTypeForProperty({ name: 'columnsJson', type: 'string', label: 'Columns' }, undefined)).toBe(
      'LabKanbanBoardColumns',
    );
  });
});
