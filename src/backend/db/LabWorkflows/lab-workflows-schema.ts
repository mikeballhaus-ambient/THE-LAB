import type { Database } from 'better-sqlite3';

export const createLabWorkflowsTable = `
  CREATE TABLE IF NOT EXISTS lab_workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    scope TEXT NOT NULL CHECK(scope IN ('global', 'user')),
    owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 100,
    definition_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * One row per workflow execution.
 *
 * `event_id` is nullable because only event-triggered runs have one — manual (W5a), schedule (W8)
 * and webhook (W10) runs do not. The column keeps its name and loses its old `NOT NULL` so that
 * `lab_workflow_runs` written by an earlier build still reads back.
 */
export const createLabWorkflowRunsTable = `
  CREATE TABLE IF NOT EXISTS lab_workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES lab_workflows(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL DEFAULT 'event',
    status TEXT NOT NULL,
    event_id TEXT,
    envelope_json TEXT,
    mock_sample_id TEXT,
    error TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME
  );
`;

/**
 * Saved trigger payloads (W5b).
 *
 * Scoped to the trigger node, not just the workflow: a schedule envelope and an event envelope are
 * not interchangeable, and W8 adds trigger variants where that distinction matters.
 *
 * `ON DELETE CASCADE` means deleting a workflow takes its samples — they are scratch data belonging
 * to that graph, of no use on their own.
 */
export const createLabWorkflowMockSamplesTable = `
  CREATE TABLE IF NOT EXISTS lab_workflow_mock_samples (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES lab_workflows(id) ON DELETE CASCADE,
    trigger_node_id TEXT NOT NULL,
    name TEXT NOT NULL,
    envelope_json TEXT NOT NULL,
    captured_at DATETIME,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Scheduled triggers (W8).
 *
 * Separate from `lab_workflows.definition_json` because `next_fire_at` is **state**: it changes on
 * every fire, and rewriting the graph document on every tick would make the editor's `updated_at`
 * meaningless (every schedule would look user-edited every minute).
 *
 * `trigger_node_id` is stored so a graph with more than one trigger can say which one the schedule
 * drives; it is deliberately not a foreign key into the JSON, which SQLite cannot express.
 */
export const createLabWorkflowSchedulesTable = `
  CREATE TABLE IF NOT EXISTS lab_workflow_schedules (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES lab_workflows(id) ON DELETE CASCADE,
    trigger_node_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('cron', 'recurrence', 'interval', 'relative', 'staleness')),
    expression TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    interval_minutes INTEGER,
    offset_days INTEGER,
    record_date_path TEXT,
    next_fire_at DATETIME,
    last_fired_at DATETIME,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Inbound webhooks.
 *
 * One hook owns **two** credentials, `test_token_hash` and `live_token_hash`. The mode is decided by
 * which hash matched, never by the URL, so a test secret can only ever start a preview. The plaintext
 * token never exists on the server after creation, so a database read cannot be turned into a working
 * URL.
 *
 * `hmac_secret` is nullable so a hook can be unsigned during local development. The route still
 * enforces the rate limit for an unsigned hook — "no signature" is a weaker mode, not an open door.
 *
 * Declared as a factory because the pre-37 migration has to rebuild the table under a temporary name
 * (see `rebuildLegacyWebhookTable`); two hand-copied DDLs would drift.
 */
function webhookTableDdl(table: string): string {
  return `
  CREATE TABLE IF NOT EXISTS ${table} (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES lab_workflows(id) ON DELETE CASCADE,
    trigger_node_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL DEFAULT '',
    test_token_hash TEXT NOT NULL DEFAULT '',
    live_token_hash TEXT NOT NULL DEFAULT '',
    /*
     * The secrets themselves, alongside their hashes.
     *
     * The hash is what inbound calls are matched against, so these columns are not needed for
     * authorisation. They exist because the designer must be able to show the author the two URLs
     * *after* creation — a secret that can only ever be read once is a secret the author loses by
     * closing a dialog, and the only recovery is rotation. Storing them is a deliberate trade:
     * a database read yields a working URL, which the design notes accept in exchange for a URL
     * that survives a reload.
     *
     * An empty string means "not known" (a row migrated from before this column existed) — the panel
     * shows a regenerate action instead of guessing a URL that would not work.
     */
    test_secret_plain TEXT NOT NULL DEFAULT '',
    live_secret_plain TEXT NOT NULL DEFAULT '',
    hmac_secret TEXT,
    event_type TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_received_at DATETIME,
    last_received_ms INTEGER,
    mapping_source_json TEXT,
    mapping_source_fingerprint TEXT,
    mapping_source_captured_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;
}

export const createLabWorkflowWebhooksTable = webhookTableDdl('lab_workflow_webhooks');

/**
 * Webhook payload captures (phase 37).
 *
 * Distinct from `lab_workflow_mock_samples` on purpose. A mock sample is a **shape you replay**; a
 * capture is a **shape that happened**, recorded so the author can build an output mapping from what a
 * caller actually sends. Conflating them would let a live production call quietly become a test fixture.
 *
 * Pruned per webhook — this is a discovery aid with a short memory, not an audit log.
 */
export const createLabWorkflowWebhookCapturesTable = `
  CREATE TABLE IF NOT EXISTS lab_workflow_webhook_captures (
    id TEXT PRIMARY KEY,
    webhook_id TEXT NOT NULL REFERENCES lab_workflow_webhooks(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK(mode IN ('test', 'live')),
    payload_json TEXT NOT NULL,
    shape_fingerprint TEXT NOT NULL,
    received_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Rebuild a pre-37 webhook table.
 *
 * `token_hash` was one credential for one mode. It becomes the **live** hash — the mode that route
 * already ran in — so an existing integration keeps working unchanged. A test hash and a slug are
 * generated, which is what gives every existing hook a test URL instead of requiring recreation.
 *
 * `ALTER TABLE ADD COLUMN` is **not** enough here, and that is the whole reason this function exists.
 * The legacy column is `token_hash TEXT NOT NULL UNIQUE`, and SQLite cannot drop or relax a column in
 * place. Leaving it behind means every insert that omits it fails with
 * `NOT NULL constraint failed: lab_workflow_webhooks.token_hash` — which is exactly what happened the
 * first time this shipped. Adding the new columns alongside a `NOT NULL` legacy column produces a
 * table that rejects all new rows: a write-only break, silent until someone creates a hook.
 *
 * So: build the new shape under a temporary name, copy, drop, rename. Reconstruction is a
 * multi-statement DDL sequence that SQLite will not roll back for us, so it runs inside an explicit
 * transaction — a half-rebuilt table would be worse than either shape.
 *
 * `PRAGMA foreign_keys` is disabled around the swap because dropping the parent table would otherwise
 * cascade-delete the captures rows that reference it.
 */
function rebuildLegacyWebhookTable(db: Database): void {
  const columns = db.prepare('PRAGMA table_info(lab_workflow_webhooks)').all() as Array<{ name: string }>;
  if (columns.length === 0) {
    return;
  }
  // Already the post-37 shape (a fresh install created it from the current DDL): nothing to do. Guarding
  // on the legacy column rather than on the presence of the new ones keeps this idempotent.
  if (!columns.some((column) => column.name === 'token_hash')) {
    return;
  }
  const has = (name: string): boolean => columns.some((column) => column.name === name);
  // A pre-37 table has none of the new columns, and a table left behind by the broken first attempt has
  // some of them. Referencing a column that is not there aborts the whole copy — SQLite validates the
  // whole SELECT before running it — so each expression must avoid naming a column that is absent,
  // including in a `CASE` branch that would never be taken.
  const coalesce = (name: string, fallback: string): string => (has(name) ? `COALESCE(${name}, ${fallback})` : fallback);
  const slugExpr = has('slug')
    ? `CASE WHEN COALESCE(slug, '') = '' THEN 'hook-' || substr(replace(id, '-', ''), 1, 8) ELSE slug END`
    : `'hook-' || substr(replace(id, '-', ''), 1, 8)`;
  const liveHashExpr = has('live_token_hash')
    ? `CASE WHEN COALESCE(live_token_hash, '') = '' THEN COALESCE(token_hash, '') ELSE live_token_hash END`
    : `COALESCE(token_hash, '')`;

  const foreignKeys = db.pragma('foreign_keys', { simple: true }) as number;
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(webhookTableDdl('lab_workflow_webhooks_migrating'));
      db.exec(`
        INSERT INTO lab_workflow_webhooks_migrating (
          id, workflow_id, trigger_node_id, name, slug,
          test_token_hash, live_token_hash, test_secret_plain, live_secret_plain,
          hmac_secret, event_type, enabled,
          last_received_at, last_received_ms,
          mapping_source_json, mapping_source_fingerprint, mapping_source_captured_at,
          created_at, updated_at
        )
        SELECT
          id,
          workflow_id,
          trigger_node_id,
          name,
          ${slugExpr},
          ${coalesce('test_token_hash', "''")},
          ${liveHashExpr},
          -- A pre-37 row never stored its secret, so the only honest value is "unknown". The panel
          -- offers regenerate rather than showing a URL that would 401.
          ${coalesce('test_secret_plain', "''")},
          ${coalesce('live_secret_plain', "''")},
          hmac_secret,
          event_type,
          enabled,
          last_received_at,
          last_received_ms,
          ${coalesce('mapping_source_json', 'NULL')},
          ${coalesce('mapping_source_fingerprint', 'NULL')},
          ${coalesce('mapping_source_captured_at', 'NULL')},
          created_at,
          updated_at
        FROM lab_workflow_webhooks
      `);
      db.exec('DROP TABLE lab_workflow_webhooks');
      db.exec('ALTER TABLE lab_workflow_webhooks_migrating RENAME TO lab_workflow_webhooks');
    })();
  } finally {
    db.pragma(`foreign_keys = ${foreignKeys ? 'ON' : 'OFF'}`);
  }
}

/**
 * Requirement sweep state (phase 33) — **the** correctness mechanism, not an optimisation.
 *
 * The sweep runs every 60 seconds over the same records. Without a record of "already fired for
 * *this* requirement and *this* record", a "3 days before" reminder would publish ~4 320 times a
 * day. The in-memory idempotency ledger is the wrong tool: it is per-evaluation and TTL'd, while a
 * sweep spans evaluations.
 *
 * `last_observed_date` is what lets the window **move**: a lease extended by a year should be able
 * to re-qualify, so the state is compared against the date as well as the fact of a previous fire.
 */
export const createLabRequirementSweepStateTable = `
  CREATE TABLE IF NOT EXISTS lab_requirement_sweep_state (
    requirement_key TEXT NOT NULL,
    record_id TEXT NOT NULL,
    last_fired_at DATETIME NOT NULL,
    last_observed_date TEXT NOT NULL,
    fire_count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (requirement_key, record_id)
  );
`;

/**
 * Per-requirement backoff state (phase 33, 33.10).
 *
 * A dead app server would otherwise be re-read every minute forever, which is both noise in the logs
 * and wasted work. Consecutive failures widen the interval; a success resets it.
 */
export const createLabRequirementSweepHealthTable = `
  CREATE TABLE IF NOT EXISTS lab_requirement_sweep_health (
    requirement_key TEXT PRIMARY KEY,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    next_attempt_ms INTEGER,
    last_error TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Runs suspended by a `wait` node, waiting on the platform clock (phase 36 / W8.6).
 *
 * Mirrors `lab_workflow_schedules` because it is the same idea — the clock owes something — but the
 * payload is different: a schedule owes an *expression evaluation*, a resume owes the **item array**
 * the next node must receive.
 *
 * `run_id` is the primary key on purpose. It makes "one suspension per run" a database invariant
 * rather than a status flag that can drift, and it makes the claim below a single-row update.
 *
 * `claimed_at` is the idempotency mechanism. `scheduler.ticking` only guards re-entrancy inside one
 * process; a tick that dies mid-walk, or a second backend, is guarded by claiming the row before
 * doing any work — a resume must never run twice, because it can notify people.
 *
 * There is deliberately **no definition snapshot**. A resume runs against the workflow as it is when
 * the clock fires; guarding against a changed shape is the owner's job (a condition node that
 * re-checks the fields). Only a *dangling* node id is the runtime's problem, and that finishes the
 * run `failed` rather than hanging.
 */
export const createLabWorkflowRunResumesTable = `
  CREATE TABLE IF NOT EXISTS lab_workflow_run_resumes (
    run_id TEXT PRIMARY KEY REFERENCES lab_workflow_runs(id) ON DELETE CASCADE,
    workflow_id TEXT NOT NULL REFERENCES lab_workflows(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    items_json TEXT NOT NULL,
    resume_at DATETIME NOT NULL,
    claimed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

/**
 * Published workflow versions (W11).
 *
 * A row is an **immutable snapshot** of `definition_json`. Editing a workflow keeps changing the live
 * row; a version is only written on publish, so rollback is "copy a snapshot back" rather than
 * "reverse-engineer what changed".
 *
 * `version` is per workflow and monotonic. Using a timestamp would make two publishes in the same
 * second ambiguous, and `ORDER BY` would then have to fall back to `rowid` anyway.
 */
export const createLabWorkflowVersionsTable = `
  CREATE TABLE IF NOT EXISTS lab_workflow_versions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES lab_workflows(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    definition_json TEXT NOT NULL,
    published_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, version)
  );
`;

/**
 * One row per graph node that actually executed.
 *
 * Nodes that never ran (rule did not match, earlier node aborted) have no row: absence is the
 * record, which keeps this table proportional to work done rather than to graph size.
 */
export const createLabWorkflowRunStepsTable = `
  CREATE TABLE IF NOT EXISTS lab_workflow_run_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES lab_workflow_runs(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    node_kind TEXT NOT NULL,
    status TEXT NOT NULL,
    items_in_count INTEGER NOT NULL DEFAULT 0,
    items_out_count INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    detail_json TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createLabWorkflowsIndexes = `
  CREATE INDEX IF NOT EXISTS idx_lab_workflows_scope_enabled_priority ON lab_workflows(scope, enabled, priority);
  CREATE INDEX IF NOT EXISTS idx_lab_workflows_owner_enabled ON lab_workflows(owner_user_id, enabled, priority);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_runs_workflow_started ON lab_workflow_runs(workflow_id, started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_runs_started ON lab_workflow_runs(started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_run_steps_run ON lab_workflow_run_steps(run_id, seq);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_mock_samples_workflow ON lab_workflow_mock_samples(workflow_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_schedules_due ON lab_workflow_schedules(enabled, next_fire_at);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_schedules_workflow ON lab_workflow_schedules(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_run_resumes_due ON lab_workflow_run_resumes(resume_at) WHERE claimed_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_webhooks_workflow ON lab_workflow_webhooks(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_lab_workflow_versions_workflow ON lab_workflow_versions(workflow_id, version DESC);
`;

/**
 * Add `mock_sample_id` to a `lab_workflow_runs` table created before W5b.
 *
 * Unlike the W1 reshape, this is additive, so `ALTER TABLE ... ADD COLUMN` is enough — no
 * rename-and-recreate, and existing rows keep their data with a `NULL` mock id, which is exactly
 * right: those runs were not mocked.
 */
function migrateAddRunMockSampleColumn(db: Database): void {
  const columns = db.prepare('PRAGMA table_info(lab_workflow_runs)').all() as Array<{ name: string }>;
  if (columns.length === 0) {
    return;
  }
  if (columns.some((column) => column.name === 'mock_sample_id')) {
    return;
  }
  db.exec('ALTER TABLE lab_workflow_runs ADD COLUMN mock_sample_id TEXT');
}

/**
 * Bring a `lab_workflow_runs` created by an earlier build up to the current shape.
 *
 * `CREATE TABLE IF NOT EXISTS` is a no-op on an existing table, so a database that already has the
 * old five-column version would silently keep it and every insert would fail. SQLite cannot drop a
 * `NOT NULL` in place, so the old table is renamed aside and the caller re-creates it. The old
 * `detail_json` is carried forward into `envelope_json` because that is what it held.
 *
 * Runs were never written before this change (nothing called an insert), so this normally finds an
 * empty table. It exists so the migration is correct rather than merely untested.
 */
function migrateLegacyWorkflowRunsTable(db: Database): void {
  const columns = db.prepare('PRAGMA table_info(lab_workflow_runs)').all() as Array<{ name: string }>;
  if (columns.length === 0) {
    return;
  }
  if (columns.some((column) => column.name === 'trigger_type')) {
    return;
  }
  const hasDetail = columns.some((column) => column.name === 'detail_json');
  db.exec('ALTER TABLE lab_workflow_runs RENAME TO lab_workflow_runs_legacy');
  db.exec(createLabWorkflowRunsTable);
  db.exec(`
    INSERT INTO lab_workflow_runs (id, workflow_id, trigger_type, status, event_id, envelope_json, error, started_at, finished_at)
    SELECT id,
           workflow_id,
           'event',
           status,
           event_id,
           ${hasDetail ? 'detail_json' : 'NULL'},
           NULL,
           executed_at,
           executed_at
    FROM lab_workflow_runs_legacy
  `);
  db.exec('DROP TABLE lab_workflow_runs_legacy');
}

/**
 * Add the plaintext secret columns to a webhook table created before they existed.
 *
 * Purely additive, so `ALTER TABLE ... ADD COLUMN` is enough and existing rows keep working. The
 * default `''` is the honest value: those rows have a hash but no recoverable secret, and the panel
 * treats `''` as "regenerate to get a URL" rather than showing one that would be rejected.
 */
function migrateAddWorkflowTagsColumn(db: Database): void {
  const columns = db.prepare('PRAGMA table_info(lab_workflows)').all() as Array<{ name: string }>;
  if (columns.length === 0) {
    return;
  }
  if (columns.some((column) => column.name === 'tags_json')) {
    return;
  }
  db.exec("ALTER TABLE lab_workflows ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'");
}

function migrateAddWebhookSecretColumns(db: Database): void {
  const columns = db.prepare('PRAGMA table_info(lab_workflow_webhooks)').all() as Array<{ name: string }>;
  if (columns.length === 0) {
    return;
  }
  const has = (name: string): boolean => columns.some((column) => column.name === name);
  if (!has('test_secret_plain')) {
    db.exec("ALTER TABLE lab_workflow_webhooks ADD COLUMN test_secret_plain TEXT NOT NULL DEFAULT ''");
  }
  if (!has('live_secret_plain')) {
    db.exec("ALTER TABLE lab_workflow_webhooks ADD COLUMN live_secret_plain TEXT NOT NULL DEFAULT ''");
  }
}

export function bootstrapLabWorkflowsSchema(db: Database): void {
  db.exec(createLabWorkflowsTable);
  migrateAddWorkflowTagsColumn(db);
  migrateLegacyWorkflowRunsTable(db);
  db.exec(createLabWorkflowRunsTable);
  migrateAddRunMockSampleColumn(db);
  db.exec(createLabWorkflowRunStepsTable);
  db.exec(createLabWorkflowMockSamplesTable);
  db.exec(createLabWorkflowSchedulesTable);
  db.exec(createLabWorkflowRunResumesTable);
  // Rebuild **before** the DDL: on a pre-37 database `CREATE TABLE IF NOT EXISTS` is a no-op, so the
  // legacy `token_hash NOT NULL` would survive and every hook insert would fail.
  rebuildLegacyWebhookTable(db);
  db.exec(createLabWorkflowWebhooksTable);
  // After the DDL, so a table created just now already has the columns and this is a no-op.
  migrateAddWebhookSecretColumns(db);
  db.exec(createLabWorkflowWebhookCapturesTable);
  db.exec(createLabWorkflowVersionsTable);
  db.exec(createLabRequirementSweepStateTable);
  db.exec(createLabRequirementSweepHealthTable);
  db.exec(createLabWorkflowsIndexes);
}

export const LabWorkflowsSQLStatementKeys = {
  workflows_all: 'workflows_all',
  workflow_by_id: 'workflow_by_id',
  count_enabled_global: 'count_enabled_global',
  count_enabled_for_owner: 'count_enabled_for_owner',
  workflow_insert: 'workflow_insert',
  workflow_update: 'workflow_update',
  workflow_delete: 'workflow_delete',
  enabled_workflows_for_evaluation: 'enabled_workflows_for_evaluation',
  run_insert: 'run_insert',
  run_finish: 'run_finish',
  run_by_id: 'run_by_id',
  runs_for_workflow: 'runs_for_workflow',
  runs_recent: 'runs_recent',
  runs_prune_for_workflow: 'runs_prune_for_workflow',
  step_insert: 'step_insert',
  steps_for_run: 'steps_for_run',
  run_delete: 'run_delete',
  mocks_for_workflow: 'mocks_for_workflow',
  mock_by_id: 'mock_by_id',
  mock_insert: 'mock_insert',
  mock_delete: 'mock_delete',
  mock_count_for_workflow: 'mock_count_for_workflow',
  mock_prune_oldest: 'mock_prune_oldest',
  schedules_all: 'schedules_all',
  schedules_for_workflow: 'schedules_for_workflow',
  schedules_due: 'schedules_due',
  schedule_by_id: 'schedule_by_id',
  schedule_for_trigger: 'schedule_for_trigger',
  schedule_insert: 'schedule_insert',
  schedule_update: 'schedule_update',
  schedule_mark_fired: 'schedule_mark_fired',
  schedule_set_next_fire: 'schedule_set_next_fire',
  schedule_delete: 'schedule_delete',
  schedule_enabled_count: 'schedule_enabled_count',
  resume_insert: 'resume_insert',
  resume_for_run: 'resume_for_run',
  resumes_due: 'resumes_due',
  resume_claim: 'resume_claim',
  resume_delete: 'resume_delete',
  /**
   * @deprecated phase 37 — resolve by `webhook_by_secret_hash` instead.
   *
   * Kept as a key so the repository's legacy `findByTokenHash` keeps compiling; it is wired to the
   * same query, which matches the live hash. A pre-37 token therefore still works and is treated as
   * live, which is the mode that route already ran in.
   */
  webhook_by_token_hash: 'webhook_by_token_hash',
  webhooks_for_workflow: 'webhooks_for_workflow',
  webhook_by_id: 'webhook_by_id',
  webhook_by_secret_hash: 'webhook_by_secret_hash',
  webhook_by_slug: 'webhook_by_slug',
  webhook_insert: 'webhook_insert',
  webhook_update: 'webhook_update',
  webhook_mark_received: 'webhook_mark_received',
  webhook_delete: 'webhook_delete',
  webhook_count_for_workflow: 'webhook_count_for_workflow',
  webhook_set_mapping_source: 'webhook_set_mapping_source',
  webhook_set_secret: 'webhook_set_secret',
  capture_insert: 'capture_insert',
  captures_recent_for_webhook: 'captures_recent_for_webhook',
  capture_latest_for_mode: 'capture_latest_for_mode',
  capture_prune: 'capture_prune',
  requirement_state_get: 'requirement_state_get',
  requirement_state_upsert: 'requirement_state_upsert',
  requirement_health_get: 'requirement_health_get',
  requirement_health_upsert: 'requirement_health_upsert',
  requirement_health_reset: 'requirement_health_reset',
  versions_for_workflow: 'versions_for_workflow',
  version_by_id: 'version_by_id',
  version_next_number: 'version_next_number',
  version_insert: 'version_insert',
  version_prune_oldest: 'version_prune_oldest',
} as const;

export type LabWorkflowsSQLStatementKey = keyof typeof LabWorkflowsSQLStatementKeys;

export const createLabWorkflowsSQLStatements = (
  db: Database,
): Record<LabWorkflowsSQLStatementKey, ReturnType<Database['prepare']>> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    [LabWorkflowsSQLStatementKeys.workflows_all]: q(`
      SELECT id, name, description, tags_json, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json, created_at, updated_at
      FROM lab_workflows
      ORDER BY priority ASC, created_at DESC
    `),
    [LabWorkflowsSQLStatementKeys.workflow_by_id]: q(`
      SELECT id, name, description, tags_json, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json, created_at, updated_at
      FROM lab_workflows
      WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.count_enabled_global]: q(`
      SELECT COUNT(*) AS c FROM lab_workflows WHERE scope = 'global' AND enabled = 1
    `),
    [LabWorkflowsSQLStatementKeys.count_enabled_for_owner]: q(`
      SELECT COUNT(*) AS c FROM lab_workflows WHERE scope = 'user' AND owner_user_id = ? AND enabled = 1
    `),
    [LabWorkflowsSQLStatementKeys.workflow_insert]: q(`
      INSERT INTO lab_workflows (id, name, description, tags_json, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    [LabWorkflowsSQLStatementKeys.workflow_update]: q(`
      UPDATE lab_workflows
      SET name = ?,
          description = ?,
          tags_json = ?,
          scope = ?,
          owner_user_id = ?,
          enabled = ?,
          priority = ?,
          definition_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.workflow_delete]: q(`
      DELETE FROM lab_workflows WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.enabled_workflows_for_evaluation]: q(`
      SELECT id, name, description, tags_json, scope, owner_user_id, created_by_user_id, enabled, priority, definition_json, created_at, updated_at
      FROM lab_workflows
      WHERE enabled = 1
        AND (
          scope = 'global'
          OR (scope = 'user' AND owner_user_id = ?)
        )
      ORDER BY priority ASC, created_at ASC
      LIMIT 30
    `),
    [LabWorkflowsSQLStatementKeys.run_insert]: q(`
      INSERT INTO lab_workflow_runs (id, workflow_id, trigger_type, status, event_id, envelope_json, mock_sample_id, started_at)
      VALUES (?, ?, ?, 'running', ?, ?, ?, ?)
    `),
    [LabWorkflowsSQLStatementKeys.run_finish]: q(`
      UPDATE lab_workflow_runs
      SET status = ?, error = ?, finished_at = ?
      WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.run_by_id]: q(`
      SELECT id, workflow_id, trigger_type, status, event_id, envelope_json, mock_sample_id, error, started_at, finished_at
      FROM lab_workflow_runs
      WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.runs_for_workflow]: q(`
      SELECT id, workflow_id, trigger_type, status, event_id, envelope_json, mock_sample_id, error, started_at, finished_at
      FROM lab_workflow_runs
      WHERE workflow_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `),
    [LabWorkflowsSQLStatementKeys.runs_recent]: q(`
      SELECT id, workflow_id, trigger_type, status, event_id, envelope_json, mock_sample_id, error, started_at, finished_at
      FROM lab_workflow_runs
      ORDER BY started_at DESC
      LIMIT ?
    `),
    [LabWorkflowsSQLStatementKeys.runs_prune_for_workflow]: q(`
      DELETE FROM lab_workflow_runs
      WHERE workflow_id = ?
        AND id NOT IN (
          SELECT id FROM lab_workflow_runs
          WHERE workflow_id = ?
          ORDER BY started_at DESC
          LIMIT ?
        )
    `),
    [LabWorkflowsSQLStatementKeys.step_insert]: q(`
      INSERT INTO lab_workflow_run_steps (
        run_id, seq, node_id, node_kind, status, items_in_count, items_out_count, duration_ms, detail_json, error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    [LabWorkflowsSQLStatementKeys.steps_for_run]: q(`
      SELECT id, run_id, seq, node_id, node_kind, status, items_in_count, items_out_count, duration_ms, detail_json, error, created_at
      FROM lab_workflow_run_steps
      WHERE run_id = ?
      ORDER BY seq ASC
    `),
    /*
     * Delete one run, scoped to its workflow.
     *
     * `workflow_id` is part of the predicate rather than checked afterwards so a run id alone cannot
     * delete a row belonging to another workflow. Steps go with it through `ON DELETE CASCADE`.
     */
    [LabWorkflowsSQLStatementKeys.run_delete]: q(`
      DELETE FROM lab_workflow_runs WHERE id = ? AND workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.mocks_for_workflow]: q(`
      SELECT id, workflow_id, trigger_node_id, name, envelope_json, captured_at, created_by_user_id, created_at
      FROM lab_workflow_mock_samples
      WHERE workflow_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT 200
    `),
    [LabWorkflowsSQLStatementKeys.mock_by_id]: q(`
      SELECT id, workflow_id, trigger_node_id, name, envelope_json, captured_at, created_by_user_id, created_at
      FROM lab_workflow_mock_samples
      WHERE id = ? AND workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.mock_insert]: q(`
      INSERT INTO lab_workflow_mock_samples (
        id, workflow_id, trigger_node_id, name, envelope_json, captured_at, created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    [LabWorkflowsSQLStatementKeys.mock_delete]: q(`
      DELETE FROM lab_workflow_mock_samples WHERE id = ? AND workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.mock_count_for_workflow]: q(`
      SELECT COUNT(*) AS c FROM lab_workflow_mock_samples WHERE workflow_id = ?
    `),
    // Trim the *oldest* when over the cap, so saving a new sample never discards the one just saved.
    //
    // `rowid DESC` breaks a tie that `created_at` cannot: it is `CURRENT_TIMESTAMP`, which has
    // one-second granularity, so a burst of saves produces identical timestamps and `ORDER BY
    // created_at DESC` alone returns an arbitrary 20 — sometimes excluding the row just inserted.
    // `rowid` is monotonically increasing, so the newest save always sorts first.
    [LabWorkflowsSQLStatementKeys.mock_prune_oldest]: q(`
      DELETE FROM lab_workflow_mock_samples
      WHERE workflow_id = ?
        AND id NOT IN (
          SELECT id FROM lab_workflow_mock_samples
          WHERE workflow_id = ?
          ORDER BY created_at DESC, rowid DESC
          LIMIT ?
        )
    `),
    [LabWorkflowsSQLStatementKeys.schedules_all]: q(`
      SELECT id, workflow_id, trigger_node_id, kind, expression, timezone, interval_minutes,
             offset_days, record_date_path, next_fire_at, last_fired_at, enabled, created_at, updated_at
      FROM lab_workflow_schedules
      ORDER BY next_fire_at ASC, created_at ASC
    `),
    [LabWorkflowsSQLStatementKeys.schedules_for_workflow]: q(`
      SELECT id, workflow_id, trigger_node_id, kind, expression, timezone, interval_minutes,
             offset_days, record_date_path, next_fire_at, last_fired_at, enabled, created_at, updated_at
      FROM lab_workflow_schedules
      WHERE workflow_id = ?
      ORDER BY created_at ASC, rowid ASC
    `),
    // Due = enabled, has a next fire, and that instant has passed.
    //
    // `next_fire_at IS NOT NULL` is load-bearing: a bounded recurrence sets it to NULL when it has
    // finished, and `NULL <= ?` is NULL (not true) in SQLite — so relying on the comparison alone
    // would be correct by accident. Stating it makes the intent explicit and survives a future
    // change to the comparison.
    [LabWorkflowsSQLStatementKeys.schedules_due]: q(`
      SELECT id, workflow_id, trigger_node_id, kind, expression, timezone, interval_minutes,
             offset_days, record_date_path, next_fire_at, last_fired_at, enabled, created_at, updated_at
      FROM lab_workflow_schedules
      WHERE enabled = 1
        AND next_fire_at IS NOT NULL
        AND next_fire_at <= ?
      ORDER BY next_fire_at ASC
      LIMIT ?
    `),
    [LabWorkflowsSQLStatementKeys.schedule_by_id]: q(`
      SELECT id, workflow_id, trigger_node_id, kind, expression, timezone, interval_minutes,
             offset_days, record_date_path, next_fire_at, last_fired_at, enabled, created_at, updated_at
      FROM lab_workflow_schedules
      WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.schedule_for_trigger]: q(`
      SELECT id, workflow_id, trigger_node_id, kind, expression, timezone, interval_minutes,
             offset_days, record_date_path, next_fire_at, last_fired_at, enabled, created_at, updated_at
      FROM lab_workflow_schedules
      WHERE workflow_id = ? AND trigger_node_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.schedule_insert]: q(`
      INSERT INTO lab_workflow_schedules (
        id, workflow_id, trigger_node_id, kind, expression, timezone, interval_minutes,
        offset_days, record_date_path, next_fire_at, enabled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    [LabWorkflowsSQLStatementKeys.schedule_update]: q(`
      UPDATE lab_workflow_schedules
      SET kind = ?,
          expression = ?,
          timezone = ?,
          interval_minutes = ?,
          offset_days = ?,
          record_date_path = ?,
          enabled = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    // One statement for both halves of a fire: the instant it fired and the instant it is next due.
    // Two statements would let a crash in between re-fire the same window forever.
    [LabWorkflowsSQLStatementKeys.schedule_mark_fired]: q(`
      UPDATE lab_workflow_schedules
      SET last_fired_at = ?,
          next_fire_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    // Recompute `next_fire_at` without touching `last_fired_at` (phase 34 reconcile).
    //
    // Separate from `schedule_update` so an edit cannot erase fire history, and separate from
    // `schedule_mark_fired` so reconcile does not pretend a fire happened. Reconcile compares the
    // pattern first and only calls this when the pattern actually changed.
    [LabWorkflowsSQLStatementKeys.schedule_set_next_fire]: q(`
      UPDATE lab_workflow_schedules
      SET next_fire_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.schedule_delete]: q(`
      DELETE FROM lab_workflow_schedules WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.schedule_enabled_count]: q(`
      SELECT COUNT(*) AS c FROM lab_workflow_schedules WHERE enabled = 1
    `),
    // --- run resumption (phase 36) -------------------------------------------
    // `resume_for_run` is the read the resume path uses to find where to continue from; it is also
    // what makes "is this run waiting?" answerable without a status column.
    [LabWorkflowsSQLStatementKeys.resume_insert]: q(`
      INSERT INTO lab_workflow_run_resumes (run_id, workflow_id, node_id, items_json, resume_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET
        node_id = excluded.node_id,
        items_json = excluded.items_json,
        resume_at = excluded.resume_at,
        claimed_at = NULL
    `),
    [LabWorkflowsSQLStatementKeys.resume_for_run]: q(`
      SELECT run_id, workflow_id, node_id, items_json, resume_at, claimed_at, created_at
      FROM lab_workflow_run_resumes
      WHERE run_id = ?
    `),
    // Unclaimed rows whose instant has arrived. `claimed_at IS NULL` is the idempotency filter, and
    // ordering by `resume_at` fires the longest-waiting run first rather than starving it.
    [LabWorkflowsSQLStatementKeys.resumes_due]: q(`
      SELECT run_id, workflow_id, node_id, items_json, resume_at, claimed_at, created_at
      FROM lab_workflow_run_resumes
      WHERE claimed_at IS NULL
        AND resume_at <= ?
      ORDER BY resume_at ASC
      LIMIT ?
    `),
    // Claiming is a conditional update: `changes === 0` means another tick got there first, which is
    // the only thing standing between a restart and a double notification.
    [LabWorkflowsSQLStatementKeys.resume_claim]: q(`
      UPDATE lab_workflow_run_resumes
      SET claimed_at = ?
      WHERE run_id = ? AND claimed_at IS NULL
    `),
    [LabWorkflowsSQLStatementKeys.resume_delete]: q(`
      DELETE FROM lab_workflow_run_resumes WHERE run_id = ?
    `),
    // @deprecated phase 37 — pre-37 callers pass one hash. Matched against the live hash only, which
    // is the mode the legacy route already ran in, so an existing integration keeps working.
    [LabWorkflowsSQLStatementKeys.webhook_by_token_hash]: q(`
      SELECT id, workflow_id, trigger_node_id, name, slug, test_token_hash, live_token_hash,
             test_secret_plain, live_secret_plain,
             hmac_secret, event_type, enabled, last_received_at, last_received_ms,
             mapping_source_json, mapping_source_fingerprint, mapping_source_captured_at,
             created_at, updated_at,
             'live' AS matched_mode
      FROM lab_workflow_webhooks
      WHERE live_token_hash = ? AND enabled = 1
      LIMIT 1
    `),
    // Resolve by **either** hash. The matching column decides the mode, so a leaked test URL cannot be
    // edited into a live one — there is no mode segment to tamper with. `enabled = 1` is part of the
    // query rather than a check after loading, so a disabled hook is indistinguishable from an unknown
    // one, which is what stops a secret being usable as an existence oracle.
    [LabWorkflowsSQLStatementKeys.webhook_by_secret_hash]: q(`
      SELECT id, workflow_id, trigger_node_id, name, slug, test_token_hash, live_token_hash,
             test_secret_plain, live_secret_plain,
             hmac_secret, event_type, enabled, last_received_at, last_received_ms,
             mapping_source_json, mapping_source_fingerprint, mapping_source_captured_at,
             created_at, updated_at,
             CASE WHEN live_token_hash = ? THEN 'live' ELSE 'test' END AS matched_mode
      FROM lab_workflow_webhooks
      WHERE enabled = 1
        AND (live_token_hash = ? OR test_token_hash = ?)
      LIMIT 1
    `),
    // Slug is legibility, never authorisation: this is used to *reject* a good slug with a bad secret,
    // not to grant anything.
    [LabWorkflowsSQLStatementKeys.webhook_by_slug]: q(`
      SELECT id FROM lab_workflow_webhooks WHERE slug = ? LIMIT 1
    `),
    [LabWorkflowsSQLStatementKeys.webhooks_for_workflow]: q(`
      SELECT id, workflow_id, trigger_node_id, name, slug, test_token_hash, live_token_hash,
             test_secret_plain, live_secret_plain,
             hmac_secret, event_type, enabled, last_received_at, last_received_ms,
             mapping_source_json, mapping_source_fingerprint, mapping_source_captured_at,
             created_at, updated_at
      FROM lab_workflow_webhooks
      WHERE workflow_id = ?
      ORDER BY created_at ASC, rowid ASC
    `),
    [LabWorkflowsSQLStatementKeys.webhook_by_id]: q(`
      SELECT id, workflow_id, trigger_node_id, name, slug, test_token_hash, live_token_hash,
             test_secret_plain, live_secret_plain,
             hmac_secret, event_type, enabled, last_received_at, last_received_ms,
             mapping_source_json, mapping_source_fingerprint, mapping_source_captured_at,
             created_at, updated_at
      FROM lab_workflow_webhooks
      WHERE id = ? AND workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.webhook_insert]: q(`
      INSERT INTO lab_workflow_webhooks (
        id, workflow_id, trigger_node_id, name, slug,
        test_token_hash, live_token_hash, test_secret_plain, live_secret_plain,
        hmac_secret, event_type, enabled
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    // Rotating one mode replaces **both** its hash and its plaintext together: they are the same
    // credential, and updating one alone would show a URL that no longer resolves.
    [LabWorkflowsSQLStatementKeys.webhook_set_secret]: q(`
      UPDATE lab_workflow_webhooks
      SET test_token_hash = CASE WHEN ? = 'test' THEN ? ELSE test_token_hash END,
          test_secret_plain = CASE WHEN ? = 'test' THEN ? ELSE test_secret_plain END,
          live_token_hash = CASE WHEN ? = 'live' THEN ? ELSE live_token_hash END,
          live_secret_plain = CASE WHEN ? = 'live' THEN ? ELSE live_secret_plain END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.webhook_update]: q(`
      UPDATE lab_workflow_webhooks
      SET name = ?, event_type = ?, hmac_secret = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workflow_id = ?
    `),
    // Adopting a captured shape: recorded with the instant, so the panel can say *when* the mapping's
    // source was observed even after the captures themselves are pruned.
    [LabWorkflowsSQLStatementKeys.webhook_set_mapping_source]: q(`
      UPDATE lab_workflow_webhooks
      SET mapping_source_json = ?,
          mapping_source_fingerprint = ?,
          mapping_source_captured_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),
    // --- webhook captures (phase 37) -----------------------------------------
    [LabWorkflowsSQLStatementKeys.capture_insert]: q(`
      INSERT INTO lab_workflow_webhook_captures (
        id, webhook_id, mode, payload_json, shape_fingerprint, received_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    [LabWorkflowsSQLStatementKeys.captures_recent_for_webhook]: q(`
      SELECT id, webhook_id, mode, payload_json, shape_fingerprint, received_at
      FROM lab_workflow_webhook_captures
      WHERE webhook_id = ?
      ORDER BY received_at DESC, rowid DESC
      LIMIT ?
    `),
    [LabWorkflowsSQLStatementKeys.capture_latest_for_mode]: q(`
      SELECT id, webhook_id, mode, payload_json, shape_fingerprint, received_at
      FROM lab_workflow_webhook_captures
      WHERE webhook_id = ? AND mode = ?
      ORDER BY received_at DESC, rowid DESC
      LIMIT 1
    `),
    // Keep the newest N per webhook. `rowid` breaks the tie because `received_at` is one-second
    // granularity and two calls in the same second would otherwise prune arbitrarily.
    [LabWorkflowsSQLStatementKeys.capture_prune]: q(`
      DELETE FROM lab_workflow_webhook_captures
      WHERE webhook_id = ?
        AND rowid NOT IN (
          SELECT rowid FROM lab_workflow_webhook_captures
          WHERE webhook_id = ?
          ORDER BY received_at DESC, rowid DESC
          LIMIT ?
        )
    `),
    // `last_received_ms` alongside the ISO string: the rate limit compares an integer, and parsing an
    // ISO string on every inbound call is both slower and a place for a format bug to hide.
    [LabWorkflowsSQLStatementKeys.webhook_mark_received]: q(`
      UPDATE lab_workflow_webhooks
      SET last_received_at = ?, last_received_ms = ?
      WHERE id = ?
    `),
    [LabWorkflowsSQLStatementKeys.webhook_delete]: q(`
      DELETE FROM lab_workflow_webhooks WHERE id = ? AND workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.webhook_count_for_workflow]: q(`
      SELECT COUNT(*) AS c FROM lab_workflow_webhooks WHERE workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.requirement_state_get]: q(`
      SELECT requirement_key, record_id, last_fired_at, last_observed_date, fire_count
      FROM lab_requirement_sweep_state
      WHERE requirement_key = ? AND record_id = ?
    `),
    // One statement for the whole "record the fire" decision. The `ON CONFLICT` arm exists because a
    // record can legitimately re-qualify after its date moves (a lease extension), and suppressing
    // that forever would make the sweep wrong in the quiet direction.
    [LabWorkflowsSQLStatementKeys.requirement_state_upsert]: q(`
      INSERT INTO lab_requirement_sweep_state (
        requirement_key, record_id, last_fired_at, last_observed_date, fire_count
      )
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(requirement_key, record_id) DO UPDATE SET
        last_fired_at = excluded.last_fired_at,
        last_observed_date = excluded.last_observed_date,
        fire_count = lab_requirement_sweep_state.fire_count + 1
    `),
    [LabWorkflowsSQLStatementKeys.requirement_health_get]: q(`
      SELECT requirement_key, consecutive_failures, next_attempt_ms, last_error, updated_at
      FROM lab_requirement_sweep_health
      WHERE requirement_key = ?
    `),
    [LabWorkflowsSQLStatementKeys.requirement_health_upsert]: q(`
      INSERT INTO lab_requirement_sweep_health (
        requirement_key, consecutive_failures, next_attempt_ms, last_error, updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(requirement_key) DO UPDATE SET
        consecutive_failures = excluded.consecutive_failures,
        next_attempt_ms = excluded.next_attempt_ms,
        last_error = excluded.last_error,
        updated_at = excluded.updated_at
    `),
    [LabWorkflowsSQLStatementKeys.requirement_health_reset]: q(`
      DELETE FROM lab_requirement_sweep_health WHERE requirement_key = ?
    `),
    [LabWorkflowsSQLStatementKeys.versions_for_workflow]: q(`
      SELECT id, workflow_id, version, name, description, definition_json, published_by_user_id,
             note, created_at
      FROM lab_workflow_versions
      WHERE workflow_id = ?
      ORDER BY version DESC
      LIMIT ?
    `),
    [LabWorkflowsSQLStatementKeys.version_by_id]: q(`
      SELECT id, workflow_id, version, name, description, definition_json, published_by_user_id,
             note, created_at
      FROM lab_workflow_versions
      WHERE id = ? AND workflow_id = ?
    `),
    // `MAX(version) + 1` in one statement. Reading the max and inserting in two steps would let two
    // concurrent publishes allocate the same number — `UNIQUE(workflow_id, version)` would then reject
    // one of them with a constraint error the user cannot act on.
    [LabWorkflowsSQLStatementKeys.version_next_number]: q(`
      SELECT COALESCE(MAX(version), 0) + 1 AS next FROM lab_workflow_versions WHERE workflow_id = ?
    `),
    [LabWorkflowsSQLStatementKeys.version_insert]: q(`
      INSERT INTO lab_workflow_versions (
        id, workflow_id, version, name, description, definition_json, published_by_user_id, note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    // Keep the newest N. `version DESC` is the tie-break-free ordering here because the number is
    // unique per workflow, unlike a timestamp.
    [LabWorkflowsSQLStatementKeys.version_prune_oldest]: q(`
      DELETE FROM lab_workflow_versions
      WHERE workflow_id = ?
        AND id NOT IN (
          SELECT id FROM lab_workflow_versions
          WHERE workflow_id = ?
          ORDER BY version DESC
          LIMIT ?
        )
    `),
  };
};
