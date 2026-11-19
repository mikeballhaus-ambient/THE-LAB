import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/quarks-login-allotment.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

export const DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_ID =
  DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_SNAPSHOT.id;

/** Login session → Quarks eligibility → credit → shell toast (rm-72.2 guinea pig). */
export function buildDemoQuarksLoginAllotmentWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } =
    DEMO_WORKFLOW_QUARKS_LOGIN_ALLOTMENT_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}