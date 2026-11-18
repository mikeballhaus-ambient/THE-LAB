export const LAB_SIDECAR_ACTIVITY_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS lab_sidecar_activity_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  thinking_label TEXT NOT NULL,
  working_labels_json TEXT NOT NULL,
  rotate_interval_ms INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
`;
