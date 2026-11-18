import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_CRM_QUOTES_LEDGER_POST_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/crm-quotes-ledger-post.snapshot';
import { DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/crm-sales-ledger-post.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

/** CRM sales record → post demo COA journal entry from `amountCents` on the event payload. */
export function buildDemoCrmSalesLedgerPostWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}

/** CRM quote record → post demo COA journal entry from `amountCents` on the event payload. */
export function buildDemoCrmQuotesLedgerPostWorkflowDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_CRM_QUOTES_LEDGER_POST_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}
