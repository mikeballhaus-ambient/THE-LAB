import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { getDatabasePath } from '@/shared/config/database';
import {
  DEMO_WORKFLOW_DB_SYNC_ENTRIES,
  type DemoWorkflowDbSyncEntry,
} from '@/shared/seeds/demo-workflows/demo-workflow-db-sync-manifest';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

export type DemoWorkflowDbExportRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priority: number;
  enabled: boolean;
  scope: string;
  definition: LabWorkflowDefinitionV2;
};

export type DemoWorkflowDbExportReport = {
  schemaVersion: 1;
  exportedAt: string;
  databasePath: string;
  workflows: DemoWorkflowDbExportRow[];
};

type WorkflowDbRow = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  enabled: number;
  scope: string;
  definition_json: string;
};

export type ReadDemoWorkflowFromDbOptions = {
  /** When false, node positions and viewport are zeroed (automation-only export). Default true for apply. */
  preserveCanvasLayout?: boolean;
};

/** Drop canvas layout for automation-only diffs (see {@link labWorkflowDefinitionContentKey}). */
export function normalizeDemoWorkflowDefinitionForSeed(
  definition: LabWorkflowDefinitionV2,
): LabWorkflowDefinitionV2 {
  return {
    ...definition,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: definition.nodes.map((node) => ({
      ...node,
      position: { x: 0, y: 0 },
    })),
  };
}

export async function openMainLabDatabaseReadonly(): Promise<Database.Database> {
  const dbPath = await getDatabasePath();
  if (!existsSync(dbPath)) {
    throw new Error(`database not found: ${dbPath}`);
  }
  return new Database(dbPath, { readonly: true });
}

export function readDemoWorkflowFromDb(
  db: Database.Database,
  entry: DemoWorkflowDbSyncEntry,
  options: ReadDemoWorkflowFromDbOptions = {},
): DemoWorkflowDbExportRow | null {
  const preserveCanvasLayout = options.preserveCanvasLayout !== false;
  const row = db
    .prepare(
      `SELECT id, name, description, priority, enabled, scope, definition_json
       FROM lab_workflows WHERE id = ?`,
    )
    .get(entry.id) as WorkflowDbRow | undefined;
  if (!row) {
    return null;
  }
  let definition: LabWorkflowDefinitionV2;
  try {
    definition = JSON.parse(row.definition_json) as LabWorkflowDefinitionV2;
  } catch {
    throw new Error(`invalid definition_json for workflow ${entry.id}`);
  }
  return {
    id: row.id,
    slug: entry.slug,
    name: row.name,
    description: row.description,
    priority: row.priority,
    enabled: row.enabled === 1,
    scope: row.scope,
    definition: preserveCanvasLayout ? definition : normalizeDemoWorkflowDefinitionForSeed(definition),
  };
}

export function readAllDemoWorkflowsFromDb(
  db: Database.Database,
  options: ReadDemoWorkflowFromDbOptions = {},
): DemoWorkflowDbExportRow[] {
  const workflows: DemoWorkflowDbExportRow[] = [];
  for (const entry of DEMO_WORKFLOW_DB_SYNC_ENTRIES) {
    const row = readDemoWorkflowFromDb(db, entry, options);
    if (row) {
      workflows.push(row);
    }
  }
  return workflows;
}
