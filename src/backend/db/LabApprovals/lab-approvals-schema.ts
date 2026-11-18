import type { Database } from 'better-sqlite3';

export const createLabApprovalPoliciesTable = `
  CREATE TABLE IF NOT EXISTS lab_approval_policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    definition_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabApprovalRequestsTable = `
  CREATE TABLE IF NOT EXISTS lab_approval_requests (
    id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL REFERENCES lab_approval_policies(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
    requester_user_id INTEGER NOT NULL REFERENCES users(id),
    subject_app_id TEXT NOT NULL,
    subject_entity_type TEXT NOT NULL,
    subject_entity_id TEXT NOT NULL,
    current_step_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabApprovalRequestStepsTable = `
  CREATE TABLE IF NOT EXISTS lab_approval_request_steps (
    request_id TEXT NOT NULL REFERENCES lab_approval_requests(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    assignee_user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'skipped')),
    comment TEXT,
    decided_at DATETIME,
    decided_by_user_id INTEGER REFERENCES users(id),
    PRIMARY KEY (request_id, step_index)
  );
`;

export const createLabApprovalsIndexes = `
  CREATE INDEX IF NOT EXISTS idx_lab_approval_requests_status ON lab_approval_requests(status);
  CREATE INDEX IF NOT EXISTS idx_lab_approval_request_steps_assignee ON lab_approval_request_steps(assignee_user_id, status);
`;

export function bootstrapLabApprovalsSchema(db: Database): void {
  db.exec(createLabApprovalPoliciesTable);
  db.exec(createLabApprovalRequestsTable);
  db.exec(createLabApprovalRequestStepsTable);
  db.exec(createLabApprovalsIndexes);
}

export const LabApprovalsSQLStatementKeys = {
  policies_all: 'policies_all',
  policy_by_id: 'policy_by_id',
  policy_insert: 'policy_insert',
  policy_update: 'policy_update',
  policy_delete: 'policy_delete',
  request_by_id: 'request_by_id',
  requests_for_requester: 'requests_for_requester',
  request_insert: 'request_insert',
  request_update_status: 'request_update_status',
  request_update_step_index: 'request_update_step_index',
  step_insert: 'step_insert',
  steps_for_request: 'steps_for_request',
  step_update: 'step_update',
  inbox_for_assignee: 'inbox_for_assignee',
} as const;

export type LabApprovalsSQLStatementKey = keyof typeof LabApprovalsSQLStatementKeys;

export const createLabApprovalsSQLStatements = (
  db: Database,
): Record<LabApprovalsSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    [LabApprovalsSQLStatementKeys.policies_all]: q(`
      SELECT id, name, description, enabled, created_by_user_id, definition_json, created_at, updated_at
      FROM lab_approval_policies
      ORDER BY name ASC
    `),
    [LabApprovalsSQLStatementKeys.policy_by_id]: q(`
      SELECT id, name, description, enabled, created_by_user_id, definition_json, created_at, updated_at
      FROM lab_approval_policies
      WHERE id = ?
    `),
    [LabApprovalsSQLStatementKeys.policy_insert]: q(`
      INSERT INTO lab_approval_policies (id, name, description, enabled, created_by_user_id, definition_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    [LabApprovalsSQLStatementKeys.policy_update]: q(`
      UPDATE lab_approval_policies
      SET name = ?, description = ?, enabled = ?, definition_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [LabApprovalsSQLStatementKeys.policy_delete]: q(`
      DELETE FROM lab_approval_policies WHERE id = ?
    `),
    [LabApprovalsSQLStatementKeys.request_by_id]: q(`
      SELECT id, policy_id, title, description, status, requester_user_id, subject_app_id, subject_entity_type, subject_entity_id, current_step_index, created_at, updated_at
      FROM lab_approval_requests
      WHERE id = ?
    `),
    [LabApprovalsSQLStatementKeys.requests_for_requester]: q(`
      SELECT id, policy_id, title, description, status, requester_user_id, subject_app_id, subject_entity_type, subject_entity_id, current_step_index, created_at, updated_at
      FROM lab_approval_requests
      WHERE requester_user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `),
    [LabApprovalsSQLStatementKeys.request_insert]: q(`
      INSERT INTO lab_approval_requests (id, policy_id, title, description, status, requester_user_id, subject_app_id, subject_entity_type, subject_entity_id, current_step_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    [LabApprovalsSQLStatementKeys.request_update_status]: q(`
      UPDATE lab_approval_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `),
    [LabApprovalsSQLStatementKeys.request_update_step_index]: q(`
      UPDATE lab_approval_requests SET current_step_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `),
    [LabApprovalsSQLStatementKeys.step_insert]: q(`
      INSERT INTO lab_approval_request_steps (request_id, step_index, assignee_user_id, status)
      VALUES (?, ?, ?, ?)
    `),
    [LabApprovalsSQLStatementKeys.steps_for_request]: q(`
      SELECT request_id, step_index, assignee_user_id, status, comment, decided_at, decided_by_user_id
      FROM lab_approval_request_steps
      WHERE request_id = ?
      ORDER BY step_index ASC
    `),
    [LabApprovalsSQLStatementKeys.step_update]: q(`
      UPDATE lab_approval_request_steps
      SET status = ?, comment = ?, decided_at = CURRENT_TIMESTAMP, decided_by_user_id = ?
      WHERE request_id = ? AND step_index = ?
    `),
    [LabApprovalsSQLStatementKeys.inbox_for_assignee]: q(`
      SELECT r.id, r.policy_id, r.title, r.description, r.status, r.requester_user_id, r.subject_app_id, r.subject_entity_type, r.subject_entity_id, r.current_step_index, r.created_at, r.updated_at
      FROM lab_approval_requests r
      INNER JOIN lab_approval_request_steps s ON s.request_id = r.id AND s.step_index = r.current_step_index
      WHERE r.status = 'pending'
        AND s.status = 'pending'
        AND s.assignee_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 100
    `),
  };
};
