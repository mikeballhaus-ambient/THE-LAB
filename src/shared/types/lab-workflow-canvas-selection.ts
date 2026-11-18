import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { WORKFLOW_ACTION_PALETTE } from '@/shared/utils/lab-workflow-definition-canvas';

export type WorkflowCanvasActionKind = (typeof WORKFLOW_ACTION_PALETTE)[number]['kind'];

export type WorkflowCanvasDetailSelection =
  | { kind: 'event'; eventType: string }
  | { kind: 'rule'; ruleId: string }
  | {
      kind: 'action';
      actionKind: WorkflowCanvasActionKind;
      label: string;
      description: string;
    }
  | { kind: 'flow'; dragId: string; step: LabWorkflowStepV1 };
