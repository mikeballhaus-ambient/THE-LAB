import { normalizeLabWorkflowDesignerPanelSizes } from '@/shared/types/lab-workflow-designer-layout';

describe('normalizeLabWorkflowDesignerPanelSizes', () => {
  test('keeps three PrimeVue panel percentages', () => {
    expect(normalizeLabWorkflowDesignerPanelSizes([22, 61, 17])).toEqual([22, 61, 17]);
  });

  test('rejects wrong panel count', () => {
    expect(normalizeLabWorkflowDesignerPanelSizes([50, 50])).toEqual([16, 68, 16]);
  });
});
