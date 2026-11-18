import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/approval-request-created-notify.snapshot';
import { DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/approval-step-pending-notify.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';
import { approvalReviewNotificationAction } from '@/shared/services/execute-lab-notification-action';

function withApprovalReviewAction(def: LabWorkflowDefinitionV2): LabWorkflowDefinitionV2 {
  const action = approvalReviewNotificationAction();
  return {
    ...def,
    nodes: def.nodes.map((node) => {
      if (node.kind !== 'action' || node.step.kind !== 'notify_users') {
        return node;
      }
      return {
        ...node,
        step: {
          ...node.step,
          actions: [action],
        },
      };
    }),
  };
}

/** Bell notification when a new approval request assigns the first step. */
export function buildDemoApprovalRequestCreatedAssigneeNotifyDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } =
    DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_SNAPSHOT.definition;
  const arranged = {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
  return withApprovalReviewAction(arranged);
}

/** Bell notification when a multi-step request advances to the next assignee. */
export function buildDemoApprovalStepPendingAssigneeNotifyDefinition(): LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } =
    DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_SNAPSHOT.definition;
  const arranged = {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
  return withApprovalReviewAction(arranged);
}
