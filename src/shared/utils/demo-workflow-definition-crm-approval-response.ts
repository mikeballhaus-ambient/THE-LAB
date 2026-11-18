import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/crm-quotes-approval-response.snapshot';
import { DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/crm-sales-approval-response.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

/** Platform approval outcome → CRM update, then notify (approved vs rejected via IF). */
export function buildDemoCrmSalesApprovalResponseWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}

export function buildDemoCrmQuotesApprovalResponseWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}

/** @deprecated Use {@link buildDemoCrmSalesApprovalResponseWorkflowDefinition}. */
export function buildDemoCrmSalesApprovalApprovedResponseWorkflowDefinition(): LabWorkflowDefinitionV2 {
  return buildDemoCrmSalesApprovalResponseWorkflowDefinition();
}

/** @deprecated Use {@link buildDemoCrmSalesApprovalResponseWorkflowDefinition}. */
export function buildDemoCrmSalesApprovalRejectedResponseWorkflowDefinition(): LabWorkflowDefinitionV2 {
  return buildDemoCrmSalesApprovalResponseWorkflowDefinition();
}

/** @deprecated Use {@link buildDemoCrmQuotesApprovalResponseWorkflowDefinition}. */
export function buildDemoCrmQuotesApprovalApprovedResponseWorkflowDefinition(): LabWorkflowDefinitionV2 {
  return buildDemoCrmQuotesApprovalResponseWorkflowDefinition();
}

/** @deprecated Use {@link buildDemoCrmQuotesApprovalResponseWorkflowDefinition}. */
export function buildDemoCrmQuotesApprovalRejectedResponseWorkflowDefinition(): LabWorkflowDefinitionV2 {
  return buildDemoCrmQuotesApprovalResponseWorkflowDefinition();
}
