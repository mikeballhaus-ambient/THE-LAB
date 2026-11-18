import { isLabWorkflowDefaultViewport } from '@/shared/utils/lab-workflow-graph-viewport';

describe('isLabWorkflowDefaultViewport', () => {
  test('treats missing viewport as default', () => {
    expect(isLabWorkflowDefaultViewport(undefined)).toBe(true);
  });

  test('recognizes origin zoom-1 viewport', () => {
    expect(isLabWorkflowDefaultViewport({ x: 0, y: 0, zoom: 1 })).toBe(true);
  });

  test('recognizes saved pan/zoom', () => {
    expect(isLabWorkflowDefaultViewport({ x: 120, y: 80, zoom: 0.72 })).toBe(false);
  });
});
