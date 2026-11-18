import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_TIMESHEET_APPROVAL_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/timesheet-approval.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

/** Weekly timesheet submit → raise approval on the seeded timesheet policy. */
export function buildDemoTimesheetApprovalWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_TIMESHEET_APPROVAL_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}
