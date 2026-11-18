/** Expense Reports — request workflow (submit → raise approval). */
import { DEMO_WORKFLOW_EXPENSE_APPROVAL_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/expense-approval.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

export function buildDemoExpenseReportApprovalWorkflowDefinition(): import('@/shared/types/lab-workflow-graph').LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_EXPENSE_APPROVAL_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}
