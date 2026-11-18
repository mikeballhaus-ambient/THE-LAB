export const LAB_COMMS_MESSAGES_TABLE = `
CREATE TABLE IF NOT EXISTS lab_comms_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  type TEXT NOT NULL,
  sender_user_id INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

export const LAB_COMMS_MESSAGES_CHANNEL_INDEX = `
CREATE INDEX IF NOT EXISTS idx_lab_comms_messages_channel_sent
  ON lab_comms_messages(channel_id, sent_at DESC);
`;

export const LAB_COMMS_CHANNEL_MEMBERS_TABLE = `
CREATE TABLE IF NOT EXISTS lab_comms_channel_members (
  channel_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (channel_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

export const LAB_COMMS_READ_CURSORS_TABLE = `
CREATE TABLE IF NOT EXISTS lab_comms_read_cursors (
  user_id INTEGER NOT NULL,
  channel_id TEXT NOT NULL,
  last_read_at TEXT NOT NULL,
  PRIMARY KEY (user_id, channel_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

/** Per-user hide of DM history before cleared_at (partner's copy unchanged). */
export const LAB_COMMS_HISTORY_CLEAR_TABLE = `
CREATE TABLE IF NOT EXISTS lab_comms_history_clear (
  user_id INTEGER NOT NULL,
  channel_id TEXT NOT NULL,
  cleared_at TEXT NOT NULL,
  PRIMARY KEY (user_id, channel_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;
