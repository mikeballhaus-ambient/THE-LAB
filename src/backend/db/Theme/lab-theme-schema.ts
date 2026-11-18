export const LAB_THEME_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS lab_theme_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL,
  preset_id TEXT NOT NULL,
  tokens_json TEXT,
  updated_at TEXT NOT NULL
);
`;
