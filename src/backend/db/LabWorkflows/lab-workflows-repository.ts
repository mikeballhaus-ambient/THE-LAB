import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import type { LabWorkflowDefinition, LabWorkflowRecord, LabWorkflowScope } from '@/shared/types/lab-workflow';
import { parseLabWorkflowDefinition } from '@/shared/types/schemas/lab-workflow-schema';
import { parseLabWorkflowTagsJson } from '@/shared/utils/lab-workflow-tags';

type WorkflowDbRow = {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  owner_user_id: number | null;
  created_by_user_id: number;
  enabled: number;
  priority: number;
  tags_json: string;
  definition_json: string;
  created_at: string;
  updated_at: string;
};

function mapWorkflowRow(row: WorkflowDbRow): LabWorkflowRecord {
  let definition: LabWorkflowDefinition;
  try {
    definition = parseLabWorkflowDefinition(JSON.parse(row.definition_json) as unknown);
  } catch {
    definition = {
      schemaVersion: 1,
      trigger: { eventType: '' },
      steps: [],
    };
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    tags: parseLabWorkflowTagsJson(row.tags_json ?? '[]'),
    scope: row.scope as LabWorkflowScope,
    ownerUserId: row.owner_user_id,
    createdByUserId: row.created_by_user_id,
    enabled: row.enabled === 1,
    priority: row.priority,
    definition,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LabWorkflowsRepository extends Repository {
  private statements: Partial<Record<LabWorkflowsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
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

  listAll(): LabWorkflowRecord[] {
    const rows = this.stmt(LabWorkflowsSQLStatementKeys.workflows_all).all() as WorkflowDbRow[];
    return rows.map(mapWorkflowRow);
  }

  getById(id: string): LabWorkflowRecord | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.workflow_by_id).get(id) as WorkflowDbRow | undefined;
    return row ? mapWorkflowRow(row) : null;
  }

  countEnabledGlobal(): number {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.count_enabled_global).get() as { c: number } | undefined;
    return row?.c ?? 0;
  }

  countEnabledForOwner(ownerUserId: number): number {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.count_enabled_for_owner).get(ownerUserId) as
      | { c: number }
      | undefined;
    return row?.c ?? 0;
  }

  insertWorkflow(record: {
    id: string;
    name: string;
    description: string | null;
    scope: LabWorkflowScope;
    ownerUserId: number | null;
    createdByUserId: number;
    enabled: boolean;
    priority: number;
    tagsJson?: string;
    definitionJson: string;
  }): void {
    this.stmt(LabWorkflowsSQLStatementKeys.workflow_insert).run(
      record.id,
      record.name,
      record.description,
      record.tagsJson ?? '[]',
      record.scope,
      record.ownerUserId,
      record.createdByUserId,
      record.enabled ? 1 : 0,
      record.priority,
      record.definitionJson,
    );
  }

  updateWorkflow(record: LabWorkflowRecord): void {
    this.stmt(LabWorkflowsSQLStatementKeys.workflow_update).run(
      record.name,
      record.description ?? null,
      JSON.stringify(record.tags ?? []),
      record.scope,
      record.ownerUserId,
      record.enabled ? 1 : 0,
      record.priority,
      JSON.stringify(record.definition),
      record.id,
    );
  }

  deleteWorkflow(id: string): void {
    this.stmt(LabWorkflowsSQLStatementKeys.workflow_delete).run(id);
  }

  listEnabledWorkflowsForEvaluation(actorUserId: number | null): LabWorkflowRecord[] {
    const rows = this.stmt(LabWorkflowsSQLStatementKeys.enabled_workflows_for_evaluation).all(
      actorUserId ?? -1,
    ) as WorkflowDbRow[];
    return rows.map(mapWorkflowRow);
  }

  clearAllWorkflowsForTests(): void {
    if (!this.db) {
      return;
    }
    this.db.prepare('DELETE FROM lab_workflow_runs').run();
    this.db.prepare('DELETE FROM lab_workflows').run();
  }
}

export const labWorkflowsRepository = new LabWorkflowsRepository();
