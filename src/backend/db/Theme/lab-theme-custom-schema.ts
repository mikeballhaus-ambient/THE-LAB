export const LAB_THEME_CUSTOM_PRESETS_TABLE = `
CREATE TABLE IF NOT EXISTS lab_theme_custom_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('light', 'dark')),
  tokens_json TEXT NOT NULL,
  created_by_user_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
