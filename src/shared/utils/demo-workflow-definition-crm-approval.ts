import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/crm-quotes-approval.snapshot';
import { DEMO_WORKFLOW_CRM_SALES_APPROVAL_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/crm-sales-approval.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

/** CRM sales record → raise approval on the CRM sales policy (request half of the pair). */
export function buildDemoCrmSalesApprovalWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_CRM_SALES_APPROVAL_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}

export function buildDemoCrmQuotesApprovalWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}
