import type { Database, Statement } from 'better-sqlite3';

// Table schema following persona-schema.ts pattern
export const createMCPServersTable = `
CREATE TABLE IF NOT EXISTS user_mcp_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    name TEXT NOT NULL,
    command TEXT,
    args TEXT,        -- JSON array stored as text
    url TEXT,                  -- For HTTP transport
    transport TEXT DEFAULT 'stdio',
    timeout INTEGER DEFAULT 30,
    enabled INTEGER DEFAULT 1,
    cwd TEXT,                  -- Working directory (JSON string or null)
    env TEXT,                  -- Environment variables (JSON object stored as text)
    headers TEXT,              -- HTTP headers (JSON object stored as text)
    tools TEXT,                -- tools stored as json
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (userid, name)
);
`;

// Indexes for query performance (following persona-schema.ts pattern)
export const createMCPServersIndexes = `
CREATE INDEX IF NOT EXISTS idx_user_mcp_servers_userid ON user_mcp_servers(userid);
CREATE INDEX IF NOT EXISTS idx_user_mcp_servers_name ON user_mcp_servers(name);
CREATE INDEX IF NOT EXISTS idx_user_mcp_servers_userid_name ON user_mcp_servers(userid, name);
`;

// SQL Statement Keys (following persona-schema.ts pattern)
export const MCPServersSQLStatementKeys = {
  // Queries
  mcp_servers_by_id: 'mcp_servers_by_id',
  mcp_servers_by_name: 'mcp_servers_by_name',
  mcp_servers_all: 'mcp_servers_all',

  // Statements
  insert_mcp_server: 'insert_mcp_server',
  update_mcp_server: 'update_mcp_server',
  delete_mcp_server: 'delete_mcp_server',

  update_mcp_server_tools: 'update_mcp_server_tools'
} as const;

export type MCPServersSQLStatementKey = keyof typeof MCPServersSQLStatementKeys;

export interface DefaultMCPServerToolMeta {
  id: string,
  name: string,
  description: string
}

export interface DefaultMCPServerConfig {
  serverName: string
  command: string,
  args: string,
  url: string | null,
  transport: string,
  headers: string,
  tools: DefaultMCPServerToolMeta[],
}

/** Runtime values for defaults that must not use cmd.exe fragments. */
export function resolveDefaultMCPServerConfig(serverName: string): DefaultMCPServerConfig {
  const base = mcpServerConfig[serverName];
  if (serverName === 'the-lab-db') {
    return {
      ...base,
      args: JSON.stringify(['-y', 'mcp-server-sqlite-npx', 'db/the_lab.db']),
    };
  }
  return base;
}

export const mcpServerConfig: Record<string, DefaultMCPServerConfig> = {
  'datetime': {
    serverName: 'datetime',
    command: 'npx',
    args: JSON.stringify(['-y', 'mcp-datetime']),
    url: null,
    transport: 'stdio',
    headers: '{}',
    tools: [
      { id: "now", name: "now", description: "Get the current date and time in one or more timezones. Returns ISO 8601, Unix timestamp, and human-readable format." },
      { id: "convert_timezone", name: "convert_timezone", description: "Convert a date/time from one timezone to another." },
      { id: "date_math", name: "date_math", description: "Add or subtract time from a date. Supports years, months, days, hours, minutes, seconds." },
      { id: "date_diff", name: "date_diff", description: "Calculate the difference between two dates in multiple units (days, hours, minutes, seconds, weeks, business days)." },
      { id: "format_date", name: "format_date", description: "Format a date/time using a format string. Tokens: YYYY, MM, DD, HH, mm, ss, SSS." },
      { id: "unix_timestamp", name: "unix_timestamp", description: "Convert between Unix timestamps and ISO 8601 dates. Pass a timestamp to get ISO, or a date to get timestamp." },
      { id: "business_days", name: "business_days", description: "Calculate business days between two dates, or add N business days to a date. Excludes weekends (Sat/Sun)." },
      { id: "explain_cron", name: "explain_cron", description: "Explain a cron expression in plain English. Supports standard 5-field cron format (minute hour dom month dow)." },
      { id: "countdown", name: "countdown", description: "Calculate time remaining until a target date, or time elapsed since a past date." },
      { id: "date_info", name: "date_info", description: "Get detailed information about a date: day of week, ISO week number, day of year, leap year, quarter, and more." }
    ] as DefaultMCPServerToolMeta[]
  },
  'the-lab-db': {
    serverName: 'the-lab-db',
    command: 'npx',
    args: JSON.stringify(['-y', 'mcp-server-sqlite-npx', 'db/the_lab.db']),
    url: null,
    transport: 'stdio',
    headers: '{}',
    tools: [
      { id: "read_query", name: "read_query", description: "Execute a SELECT query on the SQLite database" },
      { id: "write_query", name: "write_query", description: "Execute an INSERT, UPDATE, or DELETE query on the SQLite database" },
      { id: "create_table", name: "create_table", description: "Create a new table in the SQLite database" },
      { id: "list_tables", name: "list_tables", description: "List all tables in the SQLite database" },
      { id: "describe_table", name: "describe_table", description: "Get the schema information for a specific table" }
    ] as DefaultMCPServerToolMeta[]
  },
  'neural-memory': {
    serverName: 'neural-memory',
    command: 'nmem-mcp',
    args: '[]',
    url: null,
    transport: 'stdio',
    headers: '{}',
    tools: [
      { id: "nmem_recall", name: "nmem_recall", description: "Query memories via spreading activation. Use when you need past context, decisions, or knowledge." },
      { id: "nmem_remember", name: "nmem_remember", description: "Store a memory. Auto-detects type, auto-resolves contradicted errors (RESOLVED_BY synapse). Use after completing a task, fixing a bug, or making a decision." },
      { id: "nmem_context", name: "nmem_context", description: "Get recent memories as auto-injected context. Use for broad task context. For specific queries use nmem_recall. For project-level context use nmem_recap." },
      { id: "nmem_eternal", name: "nmem_eternal", description: "SAVE project context, decisions, instructions that persist across sessions. Pair with nmem_recap to LOAD. Use for project-level facts, not task-specific memories." },
      { id: "nmem_todo", name: "nmem_todo", description: "Quick TODO memory (auto-expires in 30 days). Use nmem_forget to close when done." },
      { id: "nmem_recap", name: "nmem_recap", description: "LOAD project context saved by nmem_eternal. Call at SESSION START to restore cross-session state. Level 1=quick (~500 tokens), 2=detailed, 3=full." },
      { id: "nmem_situation", name: "nmem_situation", description: "One-shot snapshot of the current working situation: active session task, top 3 recent decisions, open blockers, gap detection. Replaces nmem_recap + multiple nmem_recall calls when resuming a session." }
    ] as DefaultMCPServerToolMeta[]
  }
}

const sqlStringLiteral = (value: string): string => value.replace(/'/g, "''");

const toolEntityInsert = (
  userId: number,
  serverName: string,
  serverConfig: DefaultMCPServerConfig,
  enabled: number,
): string => {
  const urlSql =
    serverConfig.url == null ? 'NULL' : `'${sqlStringLiteral(serverConfig.url)}'`;
  const headersSql =
    serverConfig.headers == null ? 'NULL' : `'${sqlStringLiteral(serverConfig.headers)}'`;
  return `
    INSERT OR REPLACE INTO user_mcp_servers (
      userid, name, command, args, url, transport, timeout, enabled, cwd, env, headers, created_at, updated_at, tools
    ) VALUES (
      ${userId}, 
      '${serverName}',
      '${sqlStringLiteral(serverConfig.command)}',
      '${sqlStringLiteral(serverConfig.args)}',
      ${urlSql},
      '${serverConfig.transport}',
      30,
      ${enabled},
      NULL,
      '{}',
      ${headersSql},
      CURRENT_TIMESTAMP, 
      CURRENT_TIMESTAMP,
      '${sqlStringLiteral(JSON.stringify(serverConfig.tools))}'
    );
  `;
}

/**
 * Generate an INSERT statement for a default MCP server for a specific user
 * @param userId - The user ID to create the MCP server for
 * @param serverName - The name of the MCP server (datetime, the-lab-db, neural-memory)
 * @returns SQL INSERT statement string
 */
export const getDefaultMCPServerInsert = (userId: number, serverName: string): string => {
  return toolEntityInsert(userId, serverName, resolveDefaultMCPServerConfig(serverName), 1);
};

// Seed data for admin user (id=1) - following persona-schema.ts pattern
export const seedMCPServers = `
-- datetime MCP server for admin user (id=1)
${toolEntityInsert(1, 'datetime', resolveDefaultMCPServerConfig('datetime'), 1)}
-- the-lab-db MCP server for admin user (id=1)
${toolEntityInsert(1, 'the-lab-db', resolveDefaultMCPServerConfig('the-lab-db'), 1)}
-- neural-memory MCP server for admin user (id=1)
${toolEntityInsert(1, 'neural-memory', resolveDefaultMCPServerConfig('neural-memory'), 1)}
`;

/**
 * Generate prepared SQL statements for MCPServersRepository
 * @param db - SQLite database instance
 * @returns Record of prepared statements keyed by MCPServersSQLStatementKey
 */
export const createMCPServersSQLStatements = (
  db: Database,
): Record<MCPServersSQLStatementKey, Statement> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    // Query statements
    [MCPServersSQLStatementKeys.mcp_servers_by_id]: q(`
            SELECT * FROM user_mcp_servers WHERE userid = ? AND id = ?
        `),

    [MCPServersSQLStatementKeys.mcp_servers_by_name]: q(`
            SELECT * FROM user_mcp_servers WHERE userid = ? AND name = ?
        `),

    [MCPServersSQLStatementKeys.mcp_servers_all]: q(`
            SELECT * FROM user_mcp_servers WHERE userid = ? ORDER BY name ASC
        `),

    // CRUD statements
    [MCPServersSQLStatementKeys.insert_mcp_server]: q(`
            INSERT INTO user_mcp_servers (
                userid, name, command, args, url, transport, timeout, enabled, cwd, env, headers, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `),

    [MCPServersSQLStatementKeys.update_mcp_server]: q(`
            UPDATE user_mcp_servers
            SET name = ?, command = ?, args = ?, url = ?, transport = ?, timeout = ?, enabled = ?, cwd = ?, env = ?, headers = ?, updated_at = ?
            WHERE id = ? AND userid = ?
        `),

    [MCPServersSQLStatementKeys.delete_mcp_server]: q(`
            DELETE FROM user_mcp_servers WHERE id = ? AND userid = ?
        `),

    [MCPServersSQLStatementKeys.update_mcp_server_tools]: q(`
            UPDATE user_mcp_servers
            SET tools = ?, updated_at = ?
            WHERE id = ? AND userid = ?
        `),
  };
}
