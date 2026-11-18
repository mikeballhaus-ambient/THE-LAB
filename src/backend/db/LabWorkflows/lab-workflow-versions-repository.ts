import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';

export interface LabWorkflowVersionRecord {
  id: string;
  workflowId: string;
  version: number;
  name: string;
  description: string | null;
  definitionJson: string;
  publishedByUserId: number | null;
  note: string | null;
  createdAt: string;
}

type VersionDbRow = {
  id: string;
  workflow_id: string;
  version: number;
  name: string;
  description: string | null;
  definition_json: string;
  published_by_user_id: number | null;
  note: string | null;
  created_at: string;
};

/** How many versions to keep. A version is a full graph snapshot, so the table grows by size, not rows. */
export const LAB_WORKFLOW_VERSION_RETENTION = 20;

function mapRow(row: VersionDbRow): LabWorkflowVersionRecord {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    version: row.version,
    name: row.name,
    description: row.description,
    definitionJson: row.definition_json,
    publishedByUserId: row.published_by_user_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

/**
 * Published workflow versions (W11).
 *
 * A version is a snapshot, never a diff. That is a deliberate trade: a diff would be smaller and would
 * let the editor show "what changed", but reconstructing a graph from a chain of diffs means one bad
 * row makes every later version unrecoverable. A snapshot is always readable on its own, which is what
 * a rollback needs at the moment somebody is already having a bad day.
 */
export class LabWorkflowVersionsRepository extends Repository {
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

  listForWorkflow(workflowId: string, limit = LAB_WORKFLOW_VERSION_RETENTION): LabWorkflowVersionRecord[] {
    return (
      this.stmt(LabWorkflowsSQLStatementKeys.versions_for_workflow).all(
        workflowId,
        limit,
      ) as VersionDbRow[]
    ).map(mapRow);
  }

  findById(workflowId: string, id: string): LabWorkflowVersionRecord | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.version_by_id).get(id, workflowId) as
      | VersionDbRow
      | undefined;
    return row ? mapRow(row) : null;
  }

  /**
   * Snapshot the current definition and return the version number.
   *
   * Pruning happens in the same method rather than in a background job: a version table nobody prunes
   * is a slow disk leak, and the moment to decide what to drop is the moment something was added.
   */
  publish(params: {
    id: string;
    workflowId: string;
    name: string;
    description: string | null;
    definitionJson: string;
    publishedByUserId: number | null;
    note?: string | null;
  }): number {
    const next = this.stmt(LabWorkflowsSQLStatementKeys.version_next_number).get(params.workflowId) as {
      next: number;
    };
    this.stmt(LabWorkflowsSQLStatementKeys.version_insert).run(
      params.id,
      params.workflowId,
      next.next,
      params.name,
      params.description,
      params.definitionJson,
      params.publishedByUserId,
      params.note ?? null,
    );
    this.stmt(LabWorkflowsSQLStatementKeys.version_prune_oldest).run(
      params.workflowId,
      params.workflowId,
      LAB_WORKFLOW_VERSION_RETENTION,
    );
    return next.next;
  }
}

// `new`, matching every other `Repository` subclass in this folder.
export const labWorkflowVersionsRepository = new LabWorkflowVersionsRepository();
