import type { Database, Statement } from 'better-sqlite3';

// ================================================================
// CREATE TABLE Statement
// ================================================================
export const createContextSettingsTable = `
CREATE TABLE IF NOT EXISTS user_context_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userid INTEGER NOT NULL,
  enable_auto_summarization INTEGER NOT NULL DEFAULT 0,
  trigger_summarization_percent INTEGER NOT NULL DEFAULT 100,
  normal_min_value INTEGER NOT NULL DEFAULT 0,
  normal_max_value INTEGER NOT NULL DEFAULT 75,
  normal_color_class TEXT NOT NULL DEFAULT 'emerald-500',
  warning_min_value INTEGER NOT NULL DEFAULT 76,
  warning_max_value INTEGER NOT NULL DEFAULT 89,
  warning_color_class TEXT NOT NULL DEFAULT 'amber-500',
  critical_min_value INTEGER NOT NULL DEFAULT 90,
  critical_max_value INTEGER NOT NULL DEFAULT 100,
  critical_color_class TEXT NOT NULL DEFAULT 'red-500',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (userid)
);
`;

// ================================================================
// Seed Context Settings
// ================================================================
export const seedContextSettings = `
INSERT OR REPLACE INTO user_context_settings (
  userid,
  enable_auto_summarization,
  trigger_summarization_percent,
  normal_min_value,
  normal_max_value,
  normal_color_class,
  warning_min_value,
  warning_max_value,
  warning_color_class,
  critical_min_value,
  critical_max_value,
  critical_color_class,
  created_at,
  updated_at
) VALUES (
  1,
  ${Boolean(1) ? 1 : 0},
  98,
  0,
  75,
  'emerald-500',
  76,
  90,
  'amber-500',
  91,
  100,
  'red-500',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
`;


// ================================================================
// Statement Keys Constant (exported both ways for compatibility)
// ================================================================
export const ContextSettingsSQLStatementKeys = {
    SELECT_ALL: 'SELECT_ALL',
    INSERT_DEFAULT: 'INSERT_DEFAULT',
    UPDATE_ALL: 'UPDATE_ALL',
    DELETE: 'DELETE',
} as const;

// Export as createContextSettingsSQLStatementKeys for consistency with other repositories
export type ContextSettingsSQLStatementKey = keyof typeof ContextSettingsSQLStatementKeys;

// ================================================================
// Factory Function for SQL Statements
// ================================================================
export const createContextSettingsSQLStatements = (
    db: Database,
): Record<ContextSettingsSQLStatementKey, Statement> => {
    const q = (sql: string) => db.prepare(sql);

    return {

        [ContextSettingsSQLStatementKeys.SELECT_ALL]: q(`
            SELECT
                id,
                userid,
                enable_auto_summarization,
                trigger_summarization_percent,
                normal_min_value,
                normal_max_value,
                normal_color_class,
                warning_min_value,
                warning_max_value,
                warning_color_class,
                critical_min_value,
                critical_max_value,
                critical_color_class,
                created_at,
                updated_at
            FROM user_context_settings
            WHERE userid = ?
        `),

        [ContextSettingsSQLStatementKeys.INSERT_DEFAULT]: q(`
            INSERT INTO user_context_settings (
                userid,
                enable_auto_summarization,
                trigger_summarization_percent,
                normal_min_value,
                normal_max_value,
                normal_color_class,
                warning_min_value,
                warning_max_value,
                warning_color_class,
                critical_min_value,
                critical_max_value,
                critical_color_class,
                created_at,
                updated_at
            ) VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
        `),

        [ContextSettingsSQLStatementKeys.UPDATE_ALL]: q(`
            UPDATE user_context_settings
                SET
                enable_auto_summarization = ?,
                trigger_summarization_percent = ?,
                normal_min_value = ?,
                normal_max_value = ?,
                normal_color_class = ?,
                warning_min_value = ?,
                warning_max_value = ?,
                warning_color_class = ?,
                critical_min_value = ?,
                critical_max_value = ?,
                critical_color_class = ?,
                updated_at = ?
            WHERE userid = ?
        `),

        [ContextSettingsSQLStatementKeys.DELETE]: q(`DELETE FROM user_context_settings WHERE userid = ?`),
    }
}
