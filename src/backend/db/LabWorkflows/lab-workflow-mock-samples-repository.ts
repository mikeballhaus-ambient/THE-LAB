import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import {
  LAB_WORKFLOW_MOCK_SAMPLES_PER_WORKFLOW,
  type LabWorkflowMockSample,
} from '@/shared/types/lab-workflow-mock-sample';

type MockSampleDbRow = {
  id: string;
  workflow_id: string;
  trigger_node_id: string;
  name: string;
  envelope_json: string;
  captured_at: string | null;
  created_by_user_id: number;
  created_at: string;
};

function mapRow(row: MockSampleDbRow): LabWorkflowMockSample {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    triggerNodeId: row.trigger_node_id,
    name: row.name,
    envelopeJson: row.envelope_json,
    capturedAt: row.captured_at,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

/**
 * Saved trigger payloads (W5b).
 *
 * Every lookup takes a `workflowId` as well as the sample id. That is not redundant: it means a
 * caller who reaches this repository with a sample id belonging to someone else's workflow gets
 * `null` rather than the payload, so scoping cannot be forgotten at the service layer without also
 * being forgotten here.
 */
export class LabWorkflowMockSamplesRepository extends Repository {
  private statements: Partial<Record<LabWorkflowsSQLStatementKey, import('better-sqlite3').Statement>> =
    {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    // The workflow schema owns this table; bootstrapping keeps the repository usable in isolation.
    bootstrapLabWorkflowsSchema(this.db);
    this.statements = createLabWorkflowsSQLStatements(this.db);
  }

  private stmt(key: LabWorkflowsSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabWorkflows SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  listForWorkflow(workflowId: string): LabWorkflowMockSample[] {
    const rows = this.stmt(LabWorkflowsSQLStatementKeys.mocks_for_workflow).all(
      workflowId,
    ) as MockSampleDbRow[];
    return rows.map(mapRow);
  }

  getById(workflowId: string, sampleId: string): LabWorkflowMockSample | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.mock_by_id).get(sampleId, workflowId) as
      | MockSampleDbRow
      | undefined;
    return row ? mapRow(row) : null;
  }

  countForWorkflow(workflowId: string): number {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.mock_count_for_workflow).get(workflowId) as
      | { c: number }
      | undefined;
    return row?.c ?? 0;
  }

  insert(sample: {
    id: string;
    workflowId: string;
    triggerNodeId: string;
    name: string;
    envelopeJson: string;
    capturedAt?: string | null;
    createdByUserId: number;
  }): void {
    this.stmt(LabWorkflowsSQLStatementKeys.mock_insert).run(
      sample.id,
      sample.workflowId,
      sample.triggerNodeId,
      sample.name,
      sample.envelopeJson,
      sample.capturedAt ?? null,
      sample.createdByUserId,
    );
    // Trim after insert, so the sample just saved is always among the retained ones.
    this.prune(sample.workflowId);
  }

  delete(workflowId: string, sampleId: string): boolean {
    const result = this.stmt(LabWorkflowsSQLStatementKeys.mock_delete).run(sampleId, workflowId);
    return result.changes > 0;
  }

  prune(workflowId: string, limit = LAB_WORKFLOW_MOCK_SAMPLES_PER_WORKFLOW): void {
    this.stmt(LabWorkflowsSQLStatementKeys.mock_prune_oldest).run(workflowId, workflowId, limit);
  }
}

export const labWorkflowMockSamplesRepository = new LabWorkflowMockSamplesRepository();
