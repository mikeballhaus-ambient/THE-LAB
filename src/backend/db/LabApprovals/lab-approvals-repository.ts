import { Repository } from '../Repository';
import {
  LabApprovalsSQLStatementKeys,
  bootstrapLabApprovalsSchema,
  createLabApprovalsSQLStatements,
  type LabApprovalsSQLStatementKey,
} from './lab-approvals-schema';
import type {
  LabApprovalPolicyDefinitionV1,
  LabApprovalPolicyRecord,
  LabApprovalRequestRecord,
  LabApprovalRequestStatus,
  LabApprovalRequestStepRecord,
  LabApprovalStepStatus,
} from '@/shared/types/lab-approval';

type PolicyRow = {
  id: string;
  name: string;
  description: string | null;
  enabled: number;
  created_by_user_id: number;
  definition_json: string;
  created_at: string;
  updated_at: string;
};

type RequestRow = {
  id: string;
  policy_id: string;
  title: string;
  description: string | null;
  status: string;
  requester_user_id: number;
  subject_app_id: string;
  subject_entity_type: string;
  subject_entity_id: string;
  current_step_index: number;
  created_at: string;
  updated_at: string;
};

type StepRow = {
  request_id: string;
  step_index: number;
  assignee_user_id: number;
  status: string;
  comment: string | null;
  decided_at: string | null;
  decided_by_user_id: number | null;
};

function mapPolicy(row: PolicyRow): LabApprovalPolicyRecord {
  let definition: LabApprovalPolicyDefinitionV1;
  try {
    definition = JSON.parse(row.definition_json) as LabApprovalPolicyDefinitionV1;
  } catch {
    definition = { schemaVersion: 1, steps: [] };
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    enabled: row.enabled === 1,
    createdByUserId: row.created_by_user_id,
    definition,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStep(row: StepRow): LabApprovalRequestStepRecord {
  return {
    requestId: row.request_id,
    stepIndex: row.step_index,
    assigneeUserId: row.assignee_user_id,
    status: row.status as LabApprovalStepStatus,
    comment: row.comment ?? undefined,
    decidedAt: row.decided_at ?? undefined,
    decidedByUserId: row.decided_by_user_id ?? undefined,
  };
}

function mapRequest(row: RequestRow, steps: LabApprovalRequestStepRecord[]): LabApprovalRequestRecord {
  return {
    id: row.id,
    policyId: row.policy_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as LabApprovalRequestStatus,
    requesterUserId: row.requester_user_id,
    subjectAppId: row.subject_app_id,
    subjectEntityType: row.subject_entity_type,
    subjectEntityId: row.subject_entity_id,
    currentStepIndex: row.current_step_index,
    steps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LabApprovalsRepository extends Repository {
  private statements: Partial<Record<LabApprovalsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapLabApprovalsSchema(this.db);
    this.statements = createLabApprovalsSQLStatements(this.db);
  }

  private stmt(key: LabApprovalsSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabApprovals SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  listPolicies(): LabApprovalPolicyRecord[] {
    const rows = this.stmt(LabApprovalsSQLStatementKeys.policies_all).all() as PolicyRow[];
    return rows.map(mapPolicy);
  }

  getPolicyById(id: string): LabApprovalPolicyRecord | null {
    const row = this.stmt(LabApprovalsSQLStatementKeys.policy_by_id).get(id) as PolicyRow | undefined;
    return row ? mapPolicy(row) : null;
  }

  insertPolicy(record: {
    id: string;
    name: string;
    description: string | null;
    enabled: boolean;
    createdByUserId: number;
    definitionJson: string;
  }): void {
    this.stmt(LabApprovalsSQLStatementKeys.policy_insert).run(
      record.id,
      record.name,
      record.description,
      record.enabled ? 1 : 0,
      record.createdByUserId,
      record.definitionJson,
    );
  }

  updatePolicy(record: LabApprovalPolicyRecord): void {
    this.stmt(LabApprovalsSQLStatementKeys.policy_update).run(
      record.name,
      record.description ?? null,
      record.enabled ? 1 : 0,
      JSON.stringify(record.definition),
      record.id,
    );
  }

  deletePolicy(id: string): void {
    this.stmt(LabApprovalsSQLStatementKeys.policy_delete).run(id);
  }

  getRequestById(id: string): LabApprovalRequestRecord | null {
    const row = this.stmt(LabApprovalsSQLStatementKeys.request_by_id).get(id) as RequestRow | undefined;
    if (!row) {
      return null;
    }
    const steps = this.listStepsForRequest(id);
    return mapRequest(row, steps);
  }

  listRequestsForRequester(requesterUserId: number): LabApprovalRequestRecord[] {
    const rows = this.stmt(LabApprovalsSQLStatementKeys.requests_for_requester).all(requesterUserId) as RequestRow[];
    return rows.map((row) => mapRequest(row, this.listStepsForRequest(row.id)));
  }

  listInboxForAssignee(assigneeUserId: number): LabApprovalRequestRecord[] {
    const rows = this.stmt(LabApprovalsSQLStatementKeys.inbox_for_assignee).all(assigneeUserId) as RequestRow[];
    return rows.map((row) => mapRequest(row, this.listStepsForRequest(row.id)));
  }

  insertRequest(record: {
    id: string;
    policyId: string;
    title: string;
    description: string | null;
    status: LabApprovalRequestStatus;
    requesterUserId: number;
    subjectAppId: string;
    subjectEntityType: string;
    subjectEntityId: string;
    currentStepIndex: number;
  }): void {
    this.stmt(LabApprovalsSQLStatementKeys.request_insert).run(
      record.id,
      record.policyId,
      record.title,
      record.description,
      record.status,
      record.requesterUserId,
      record.subjectAppId,
      record.subjectEntityType,
      record.subjectEntityId,
      record.currentStepIndex,
    );
  }

  updateRequestStatus(id: string, status: LabApprovalRequestStatus): void {
    this.stmt(LabApprovalsSQLStatementKeys.request_update_status).run(status, id);
  }

  updateRequestStepIndex(id: string, stepIndex: number): void {
    this.stmt(LabApprovalsSQLStatementKeys.request_update_step_index).run(stepIndex, id);
  }

  insertStep(requestId: string, stepIndex: number, assigneeUserId: number, status: LabApprovalStepStatus): void {
    this.stmt(LabApprovalsSQLStatementKeys.step_insert).run(requestId, stepIndex, assigneeUserId, status);
  }

  listStepsForRequest(requestId: string): LabApprovalRequestStepRecord[] {
    const rows = this.stmt(LabApprovalsSQLStatementKeys.steps_for_request).all(requestId) as StepRow[];
    return rows.map(mapStep);
  }

  updateStep(
    requestId: string,
    stepIndex: number,
    status: LabApprovalStepStatus,
    comment: string | null,
    decidedByUserId: number,
  ): void {
    this.stmt(LabApprovalsSQLStatementKeys.step_update).run(
      status,
      comment,
      decidedByUserId,
      requestId,
      stepIndex,
    );
  }

  clearAllForTests(): void {
    if (!this.db) {
      return;
    }
    this.db.prepare('DELETE FROM lab_approval_request_steps').run();
    this.db.prepare('DELETE FROM lab_approval_requests').run();
    this.db.prepare('DELETE FROM lab_approval_policies').run();
  }

  /** Removes approval requests (and steps via CASCADE) tied to seeded demo policies. */
  deleteRequestsForPolicyIds(policyIds: readonly string[]): number {
    if (!this.db || policyIds.length === 0) {
      return 0;
    }
    const placeholders = policyIds.map(() => '?').join(', ');
    const result = this.db
      .prepare(`DELETE FROM lab_approval_requests WHERE policy_id IN (${placeholders})`)
      .run(...policyIds);
    return result.changes;
  }
}

export const labApprovalsRepository = new LabApprovalsRepository();
