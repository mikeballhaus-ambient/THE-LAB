export const createMcpStdioAllowlistTable = `
CREATE TABLE IF NOT EXISTS user_mcp_stdio_allowlist (
  userid INTEGER NOT NULL,
  server_id INTEGER NOT NULL,
  granted_by INTEGER,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (userid, server_id),
  FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES user_mcp_servers(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);
`;

export const createMcpStdioAccessRequestsTable = `
CREATE TABLE IF NOT EXISTS user_mcp_stdio_access_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userid INTEGER NOT NULL,
  server_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
  note TEXT,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES user_mcp_servers(id) ON DELETE CASCADE
);
`;

export const createMcpStdioAccessIndexes = `
CREATE INDEX IF NOT EXISTS idx_mcp_stdio_allowlist_user ON user_mcp_stdio_allowlist(userid);
CREATE INDEX IF NOT EXISTS idx_mcp_stdio_requests_status ON user_mcp_stdio_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_mcp_stdio_requests_user ON user_mcp_stdio_access_requests(userid);
`;

export const McpStdioAccessSQLStatementKeys = {
  allowlist_has: 'allowlist_has',
  allowlist_server_ids_for_user: 'allowlist_server_ids_for_user',
  insert_allowlist: 'insert_allowlist',
  requests_by_user: 'requests_by_user',
  pending_requests_all: 'pending_requests_all',
  insert_request: 'insert_request',
  request_by_id: 'request_by_id',
  update_request_status: 'update_request_status',
  pending_request_for_user_server: 'pending_request_for_user_server',
} as const;

export type McpStdioAccessSQLStatementKey = keyof typeof McpStdioAccessSQLStatementKeys;

export const createMcpStdioAccessSQLStatements = (db: {
  prepare: (sql: string) => { get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[]; run: (...args: unknown[]) => unknown };
}): Record<McpStdioAccessSQLStatementKey, ReturnType<typeof db.prepare>> => {
  const q = (sql: string) => db.prepare(sql);
  return {
    [McpStdioAccessSQLStatementKeys.allowlist_has]: q(`
      SELECT 1 AS ok FROM user_mcp_stdio_allowlist WHERE userid = ? AND server_id = ?
    `),
    [McpStdioAccessSQLStatementKeys.allowlist_server_ids_for_user]: q(`
      SELECT server_id FROM user_mcp_stdio_allowlist WHERE userid = ?
    `),
    [McpStdioAccessSQLStatementKeys.insert_allowlist]: q(`
      INSERT OR IGNORE INTO user_mcp_stdio_allowlist (userid, server_id, granted_by, granted_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `),
    [McpStdioAccessSQLStatementKeys.requests_by_user]: q(`
      SELECT r.*, s.name AS server_name
      FROM user_mcp_stdio_access_requests r
      JOIN user_mcp_servers s ON s.id = r.server_id AND s.userid = r.userid
      WHERE r.userid = ?
      ORDER BY r.created_at DESC
    `),
    [McpStdioAccessSQLStatementKeys.pending_requests_all]: q(`
      SELECT r.*, s.name AS server_name, u.email AS requester_email, u.name AS requester_name
      FROM user_mcp_stdio_access_requests r
      JOIN user_mcp_servers s ON s.id = r.server_id AND s.userid = r.userid
      JOIN users u ON u.id = r.userid
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
    `),
    [McpStdioAccessSQLStatementKeys.insert_request]: q(`
      INSERT INTO user_mcp_stdio_access_requests (userid, server_id, status, note, created_at)
      VALUES (?, ?, 'pending', ?, CURRENT_TIMESTAMP)
    `),
    [McpStdioAccessSQLStatementKeys.request_by_id]: q(`
      SELECT * FROM user_mcp_stdio_access_requests WHERE id = ?
    `),
    [McpStdioAccessSQLStatementKeys.update_request_status]: q(`
      UPDATE user_mcp_stdio_access_requests
      SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [McpStdioAccessSQLStatementKeys.pending_request_for_user_server]: q(`
      SELECT id FROM user_mcp_stdio_access_requests
      WHERE userid = ? AND server_id = ? AND status = 'pending'
      LIMIT 1
    `),
  };
};
