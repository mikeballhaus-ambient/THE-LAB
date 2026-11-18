import { DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/timesheet-approval-response.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

/** Platform approval outcome → Time Tracking timesheet update, then notify (approved vs rejected via IF). */
export function buildDemoTimesheetApprovalResponseWorkflowDefinition(): import('@/shared/types/lab-workflow-graph').LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}
