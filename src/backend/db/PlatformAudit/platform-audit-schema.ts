export const createPlatformAuditLogTable = `
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const createPlatformAuditLogIndexes = `
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created_at ON platform_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_category ON platform_audit_log(category, created_at DESC);
`;
