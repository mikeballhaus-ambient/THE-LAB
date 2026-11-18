import {
  createToolsTable,
  createIndexes,
  seedTools,
  toolsSQLStatementKeys,
  ToolsSQLStatementKey,
  createToolsSQLStatements,
} from './tools-schema';

import { ToolsList } from '../../../shared/types/mcp-tools';
import type { Statement } from 'better-sqlite3';
import { Repository } from '../Repository';

interface ToolDbRow {
  id: string;
  name: string;
  description: string;
}

export class ToolsRepository extends Repository {
  private statements = {} as Record<ToolsSQLStatementKey, Statement>;

  close(): void {
    this.statements = {} as Record<ToolsSQLStatementKey, Statement>;
  }

  async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createToolsTable);
      this.db.exec(createIndexes);
      this.statements = createToolsSQLStatements(this.db);
      // INSERT OR IGNORE — picks up new platform tools (e.g. lab_integrations_*) on existing DBs
      this.db.exec(seedTools);
    }
  }

  // Query methods
  getAllTools(): ToolsList[] {
    if (!this.statements[toolsSQLStatementKeys.tools_all]) return [];

    const rows = this.statements[toolsSQLStatementKeys.tools_all].all() as ToolDbRow[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
    }));
  }

  getToolById(id: string): ToolsList | undefined {
    if (!this.statements[toolsSQLStatementKeys.tools_by_id]) return undefined;

    const row = this.statements[toolsSQLStatementKeys.tools_by_id].get(id) as ToolDbRow | undefined;
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
    };
  }

  // CRUD operations
  addTool(tool: ToolsList): void {
    if (!tool.id || !tool.name || !tool.description) {
      console.error('[ToolsRepository] Tool id, name, and description are required');
      return;
    }
    if (!this.statements[toolsSQLStatementKeys.insert_tool]) return;
    this.db.transaction(() => {
      this.statements[toolsSQLStatementKeys.insert_tool].run(
        tool.id,
        tool.name,
        tool.description
      );
    })();
  }

  /**
   * Insert a tool or refresh its name/description when the id already exists.
   *
   * Used to reconcile the catalogue with the live MCP registry, so a newly registered server shows up
   * in Settings → Personas → Tools without a hand-maintained seed entry.
   */
  upsertTool(tool: ToolsList): void {
    if (!tool.id || !tool.name || !tool.description) {
      console.error('[ToolsRepository] Tool id, name, and description are required');
      return;
    }
    if (!this.statements[toolsSQLStatementKeys.upsert_tool]) return;
    this.db.transaction(() => {
      this.statements[toolsSQLStatementKeys.upsert_tool].run(
        tool.id,
        tool.name,
        tool.description
      );
    })();
  }

  upsertTools(tools: ToolsList[]): number {
    if (!this.statements[toolsSQLStatementKeys.upsert_tool]) return 0;
    const run = this.db.transaction((rows: ToolsList[]) => {
      let written = 0;
      for (const tool of rows) {
        if (!tool.id || !tool.name || !tool.description) continue;
        this.statements[toolsSQLStatementKeys.upsert_tool].run(
          tool.id,
          tool.name,
          tool.description
        );
        written += 1;
      }
      return written;
    });
    return run(tools);
  }

  updateTool(tool: ToolsList): void {
    if (!tool.id || !tool.name || !tool.description) {
      console.error('[ToolsRepository] Tool id, name, and description are required');
      return;
    }
    if (!this.statements[toolsSQLStatementKeys.update_tool]) return;
    this.db.transaction(() => {
      this.statements[toolsSQLStatementKeys.update_tool].run(
        tool.name,
        tool.description,
        tool.id
      );
    })();
  }

  removeTool(id: string): void {
    if (!this.statements[toolsSQLStatementKeys.delete_tool]) return;
    this.db.transaction(() => {
      this.statements[toolsSQLStatementKeys.delete_tool].run(id);
    })();
  }
}

export const toolsRepository = new ToolsRepository();

export default toolsRepository;
