import {
  createMCPServersTable,
  createMCPServersIndexes,
  seedMCPServers,
  MCPServersSQLStatementKeys,
  createMCPServersSQLStatements,
  MCPServersSQLStatementKey,
  resolveDefaultMCPServerConfig,
} from './mcp-servers-schema';
import { IMCPServerConfig } from '../../../shared/types';
import { Repository } from '../Repository';

export class MCPServersRepository extends Repository {
  private statements: Partial<Record<MCPServersSQLStatementKey, unknown>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createMCPServersTable);
      this.db.exec(createMCPServersIndexes);

      this.statements = createMCPServersSQLStatements(this.db);

      interface CountResult {
        count: number;
      }

      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM user_mcp_servers').get() as CountResult | null;
      if (!countResult || typeof countResult.count !== 'number') {
        throw new Error('Invalid count result');
      }
      const count = countResult.count;
      if (count === 0 && typeof count === 'number') {
        this.db.exec(seedMCPServers);
      }

      this.repairBuiltInMCPServerConfigs();
    }
  }

  private repairBuiltInMCPServerConfigs(): void {
    const theLabDbArgs = JSON.stringify(['-y', 'mcp-server-sqlite-npx', 'db/the_lab.db']);
    this.db
      .prepare(
        `UPDATE user_mcp_servers
         SET command = 'npx', args = ?, updated_at = CURRENT_TIMESTAMP
         WHERE name = 'the-lab-db' AND args LIKE ?`,
      )
      .run(theLabDbArgs, '%/c%');

    this.db
      .prepare(`UPDATE user_mcp_servers SET url = NULL WHERE url = 'NULL'`)
      .run();

    this.db.prepare(`DELETE FROM user_mcp_servers WHERE name = 'n8n-mcp'`).run();
  }

  get(userId: number, id: number): IMCPServerConfig | undefined {
    const row = (this.statements[MCPServersSQLStatementKeys.mcp_servers_by_id] as { get: (userId: number, id: number) => unknown }).get(userId, id);
    if (!row) return undefined;
    return this.mapRowToMCPServerConfig(row);
  }

  getByName(userId: number, name: string): IMCPServerConfig | undefined {
    const row = (this.statements[MCPServersSQLStatementKeys.mcp_servers_by_name] as { get: (userId: number, name: string) => unknown }).get(userId, name);
    if (!row) return undefined;
    return this.mapRowToMCPServerConfig(row);
  }

  getAll(userId: number): IMCPServerConfig[] {
    const rows = (this.statements[MCPServersSQLStatementKeys.mcp_servers_all] as { all: (userId: number) => unknown[] }).all(userId);
    return rows.map(row => this.mapRowToMCPServerConfig(row));
  }

  add(mcpsConfig: IMCPServerConfig): number {
    const info = this.db.transaction(() => {
      return (this.statements.insert_mcp_server as { run: (...args: unknown[]) => unknown }).run(
        mcpsConfig.userId,
        mcpsConfig.name,
        mcpsConfig.command,
        JSON.stringify(mcpsConfig.args),
        mcpsConfig.url || null,
        mcpsConfig.transport || 'stdio',
        mcpsConfig.timeout || 30,
        mcpsConfig.enabled ? 1 : 0,
        mcpsConfig.cwd || null,
        mcpsConfig.env ? JSON.stringify(mcpsConfig.env) : null,
        mcpsConfig.headers ? JSON.stringify(mcpsConfig.headers) : null,
      );
    })();
    return (info as { lastInsertRowid: number }).lastInsertRowid;
  }

  update(id: number, mcpsConfig: IMCPServerConfig): void {
    this.db.transaction(() => {
      (this.statements.update_mcp_server as { run: (...args: unknown[]) => unknown }).run(
        mcpsConfig.name,
        mcpsConfig.command,
        JSON.stringify(mcpsConfig.args),
        mcpsConfig.url || null,
        mcpsConfig.transport || 'stdio',
        mcpsConfig.timeout || 30,
        mcpsConfig.enabled ? 1 : 0,
        mcpsConfig.cwd || null,
        mcpsConfig.env ? JSON.stringify(mcpsConfig.env) : null,
        mcpsConfig.headers ? JSON.stringify(mcpsConfig.headers) : null,
        new Date().toISOString(),
        id,
        mcpsConfig.userId,
      );
    })();
  }

  delete(userId: number, id: number): void {
    this.db.transaction(() => {
      (this.statements.delete_mcp_server as { run: (id: number, userId: number) => unknown }).run(id, userId);
    })();
  }

  toggleEnabled(userId: number, id: number): void {
    const server = this.get(userId, id);
    if (!server) {
      return;
    }
    const nextEnabled = !server.enabled;
    this.update(id, { ...server, userId, enabled: nextEnabled });
  }

  update_mcp_server_tools(userId: number, id: number, tools: Array<unknown>): void {
    this.db.transaction(() => {
      (this.statements.update_mcp_server_tools as { run: (...args: unknown[]) => unknown }).run(
        JSON.stringify(tools),
        new Date().toISOString(),
        id,
        userId
      );
    })();
  }

  insertDefaultMCPServerForUser(userId: number, serverName: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_mcp_servers (
        userid, name, command, args, url, transport, timeout, enabled, cwd, env, headers, created_at, updated_at, tools
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const config = resolveDefaultMCPServerConfig(serverName);

    this.db.transaction(() => {
      stmt.run(
        userId,
        serverName,
        config.command,
        config.args,
        config.url === null ? null : config.url,
        config.transport,
        30,
        1,
        null,
        '{}',
        config.headers === null ? null : config.headers,
        new Date().toISOString(),
        new Date().toISOString(),
        JSON.stringify(config.tools)
      );
    })();
  }

  private mapRowToMCPServerConfig(row: unknown): IMCPServerConfig {
    return {
      id: (row as { id: number }).id,
      userId: (row as { userid: number }).userid,
      name: (row as { name: string }).name,
      command: (row as { command: string }).command,
      args: (row as { args?: string }).args ? JSON.parse((row as { args: string }).args) : [],
      url: (row as { url?: string }).url,
      transport: (row as { transport?: string }).transport as 'stdio' | 'streamable-http',
      timeout: (row as { timeout?: number }).timeout,
      enabled: (row as { enabled?: number }).enabled === 1,
      cwd: (row as { cwd?: string }).cwd,
      env: (row as { env?: string }).env ? JSON.parse((row as { env: string }).env) : {},
      headers: (row as { headers?: string }).headers ? JSON.parse((row as { headers: string }).headers) : {},
      tools: (row as { tools?: string }).tools ? JSON.parse((row as { tools: string }).tools) : [],
      created_at: (row as { created_at: string }).created_at || '',
      updated_at: (row as { updated_at: string }).updated_at || '',
    };
  }
}

export const mcpServersRepository = new MCPServersRepository();
