/**
 * @see plans/rm-61-approvals-policies/architecture.md
 */
export const LAB_APPROVAL_POLICY_SCHEMA_VERSION = 1;
export const LAB_APPROVALS_SOURCE_APP_ID = 'platform-approvals';

export interface LabApprovalPolicyStepV1 {
  label?: string;
  assigneeUserId: number;
}

export interface LabApprovalPolicyDefinitionV1 {
  schemaVersion: typeof LAB_APPROVAL_POLICY_SCHEMA_VERSION;
  steps: LabApprovalPolicyStepV1[];
}

export interface LabApprovalPolicyRecord {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdByUserId: number;
  definition: LabApprovalPolicyDefinitionV1;
  createdAt: string;
  updatedAt: string;
}

export type LabApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type LabApprovalStepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface LabApprovalRequestStepRecord {
  requestId: string;
  stepIndex: number;
  assigneeUserId: number;
  status: LabApprovalStepStatus;
  comment?: string;
  decidedAt?: string;
  decidedByUserId?: number;
}

export interface LabApprovalRequestRecord {
  id: string;
  policyId: string;
  title: string;
  description?: string;
  status: LabApprovalRequestStatus;
  requesterUserId: number;
  subjectAppId: string;
  subjectEntityType: string;
  subjectEntityId: string;
  currentStepIndex: number;
  steps: LabApprovalRequestStepRecord[];
  createdAt: string;
  updatedAt: string;
}
