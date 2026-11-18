import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { buildDemoCrmSalesApprovalWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-crm-approval';

/** @deprecated Prefer {@link buildDemoCrmSalesApprovalWorkflowDefinition} or {@link DEMO_WORKFLOW_SEEDS}. */
export function buildDemoWorkflowDefinition(): LabWorkflowDefinitionV2 {
  return buildDemoCrmSalesApprovalWorkflowDefinition();
}
