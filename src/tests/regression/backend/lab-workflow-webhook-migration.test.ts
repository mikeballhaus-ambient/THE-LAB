/**
 * Regression cover for the pre-37 → post-37 webhook table rebuild.
 *
 * The first version of this migration used `ALTER TABLE ADD COLUMN` and left the legacy
 * `token_hash TEXT NOT NULL UNIQUE` in place. Every suite that bootstraps a database carrying that
 * legacy shape then failed on the demo seed with
 *
 *     SqliteError: NOT NULL constraint failed: lab_workflow_webhooks.token_hash
 *
 * — a **write-only** break: reads were fine, so the damage only appeared when something inserted a
 * hook. These tests pin the shape of the rebuilt table, not just the absence of the old column, because
 * "column is gone" and "table accepts the new row" are different facts.
 */
import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  bootstrapLabWorkflowsSchema,
  createLabWorkflowWebhooksTable,
  createLabWorkflowsTable,
} from '@/backend/db/LabWorkflows/lab-workflows-schema';

/** The exact DDL that shipped before phase 37. */
const LEGACY_WEBHOOKS_DDL = `
  CREATE TABLE lab_workflow_webhooks (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES lab_workflows(id) ON DELETE CASCADE,
    trigger_node_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    hmac_secret TEXT,
    event_type TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_received_at DATETIME,
    last_received_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}

/** A database in the pre-37 shape: users table, one workflow, one legacy hook. */
function legacyDb(): Database.Database {
  const db = freshDb();
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);');
  db.exec(createLabWorkflowsTable);
  db.exec(LEGACY_WEBHOOKS_DDL);
  db.prepare(
    `INSERT INTO users (id, name) VALUES (1, 'Owner')`,
  ).run();
  db.prepare(
    `INSERT INTO lab_workflows (id, name, scope, created_by_user_id, definition_json)
     VALUES ('wf-1', 'Legacy workflow', 'global', 1, '{}')`,
  ).run();
  db.prepare(
    `INSERT INTO lab_workflow_webhooks
       (id, workflow_id, trigger_node_id, name, token_hash, hmac_secret, event_type, enabled)
     VALUES ('hook-1', 'wf-1', 'trigger-1', 'Legacy hook', 'legacy-hash-abc', NULL, 'task.created', 1)`,
  ).run();
  return db;
}

function columns(db: Database.Database, table = 'lab_workflow_webhooks'): Array<{ name: string; notnull: number }> {
  return db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; notnull: number }>;
}

describe('pre-37 webhook table rebuild', () => {
  test('a half-migrated table rejects every post-37 insert', () => {
    // The exact state the broken first migration produced: the new columns were added, but the legacy
    // `token_hash NOT NULL` was never removed. Reproducing it here is the point — this is the CI failure
    // (`NOT NULL constraint failed: lab_workflow_webhooks.token_hash`), and if this stops throwing the
    // rebuild below has stopped proving anything.
    const db = legacyDb();
    db.exec(`ALTER TABLE lab_workflow_webhooks ADD COLUMN slug TEXT NOT NULL DEFAULT ''`);
    db.exec(`ALTER TABLE lab_workflow_webhooks ADD COLUMN test_token_hash TEXT NOT NULL DEFAULT ''`);
    db.exec(`ALTER TABLE lab_workflow_webhooks ADD COLUMN live_token_hash TEXT NOT NULL DEFAULT ''`);

    expect(() =>
      db
        .prepare(
          `INSERT INTO lab_workflow_webhooks
             (id, workflow_id, trigger_node_id, name, slug, test_token_hash, live_token_hash,
              hmac_secret, event_type, enabled)
           VALUES ('hook-2', 'wf-1', 'trigger-1', 'New hook', 'slug-2', 'test', 'live', NULL, 'x', 1)`,
        )
        .run(),
    ).toThrow(/token_hash/);
    db.close();
  });

  test('bootstrap repairs a half-migrated table too', () => {
    const db = legacyDb();
    db.exec(`ALTER TABLE lab_workflow_webhooks ADD COLUMN slug TEXT NOT NULL DEFAULT ''`);
    db.exec(`ALTER TABLE lab_workflow_webhooks ADD COLUMN test_token_hash TEXT NOT NULL DEFAULT ''`);
    db.exec(`ALTER TABLE lab_workflow_webhooks ADD COLUMN live_token_hash TEXT NOT NULL DEFAULT ''`);

    bootstrapLabWorkflowsSchema(db);

    expect(columns(db).map((column) => column.name)).not.toContain('token_hash');
    expect(() =>
      db
        .prepare(
          `INSERT INTO lab_workflow_webhooks
             (id, workflow_id, trigger_node_id, name, slug, test_token_hash, live_token_hash,
              hmac_secret, event_type, enabled)
           VALUES ('hook-2', 'wf-1', 'trigger-1', 'New hook', 'slug-2', 'test', 'live', NULL, 'x', 1)`,
        )
        .run(),
    ).not.toThrow();
    db.close();
  });

  test('bootstrap removes the legacy NOT NULL column', () => {
    const db = legacyDb();
    bootstrapLabWorkflowsSchema(db);

    const names = columns(db).map((column) => column.name);
    expect(names).not.toContain('token_hash');
    expect(names).toEqual(
      expect.arrayContaining(['slug', 'test_token_hash', 'live_token_hash', 'mapping_source_json']),
    );
    db.close();
  });

  test('the rebuilt table accepts the post-37 insert shape', () => {
    const db = legacyDb();
    bootstrapLabWorkflowsSchema(db);

    expect(() =>
      db
        .prepare(
          `INSERT INTO lab_workflow_webhooks
             (id, workflow_id, trigger_node_id, name, slug, test_token_hash, live_token_hash,
              hmac_secret, event_type, enabled)
           VALUES ('hook-2', 'wf-1', 'trigger-1', 'New hook', 'slug-2', 'test', 'live', NULL, 'x', 1)`,
        )
        .run(),
    ).not.toThrow();
    db.close();
  });

  test('the legacy token is carried over as the live hash', () => {
    const db = legacyDb();
    bootstrapLabWorkflowsSchema(db);

    const row = db
      .prepare('SELECT live_token_hash, test_token_hash FROM lab_workflow_webhooks WHERE id = ?')
      .get('hook-1') as { live_token_hash: string; test_token_hash: string };
    // The mode the legacy route already ran in: an existing integration keeps working untouched.
    expect(row.live_token_hash).toBe('legacy-hash-abc');
    expect(row.test_token_hash).toBe('');
    db.close();
  });

  test('a blank slug is derived so the row gains a test URL', () => {
    const db = legacyDb();
    bootstrapLabWorkflowsSchema(db);

    const row = db
      .prepare('SELECT slug FROM lab_workflow_webhooks WHERE id = ?')
      .get('hook-1') as { slug: string };
    expect(row.slug).toBe('hook-hook1');
    db.close();
  });

  test('is idempotent — a second bootstrap changes nothing', () => {
    const db = legacyDb();
    bootstrapLabWorkflowsSchema(db);
    const before = db.prepare('SELECT * FROM lab_workflow_webhooks').all();

    bootstrapLabWorkflowsSchema(db);

    expect(db.prepare('SELECT * FROM lab_workflow_webhooks').all()).toEqual(before);
    expect(columns(db).map((column) => column.name)).not.toContain('token_hash');
    db.close();
  });

  test('a fresh install is left alone', () => {
    const db = freshDb();
    db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);');
    db.exec(createLabWorkflowsTable);
    db.exec(createLabWorkflowWebhooksTable);

    bootstrapLabWorkflowsSchema(db);

    expect(columns(db).map((column) => column.name)).not.toContain('token_hash');
    db.close();
  });

  test('records survive the rebuild', () => {
    const db = legacyDb();
    bootstrapLabWorkflowsSchema(db);

    const row = db
      .prepare('SELECT name, event_type, enabled, trigger_node_id FROM lab_workflow_webhooks WHERE id = ?')
      .get('hook-1') as { name: string; event_type: string; enabled: number; trigger_node_id: string };
    expect(row).toEqual({
      name: 'Legacy hook',
      event_type: 'task.created',
      enabled: 1,
      trigger_node_id: 'trigger-1',
    });
    db.close();
  });

  test('the captures table can still reference the rebuilt hooks table', () => {
    const db = legacyDb();
    bootstrapLabWorkflowsSchema(db);

    // Dropping and renaming the parent under `foreign_keys = OFF` must leave the child's FK intact.
    expect(() =>
      db
        .prepare(
          `INSERT INTO lab_workflow_webhook_captures
             (id, webhook_id, mode, payload_json, shape_fingerprint, received_at)
           VALUES ('cap-1', 'hook-1', 'test', '{}', 'fp', '2026-01-01T00:00:00.000Z')`,
        )
        .run(),
    ).not.toThrow();
    expect(db.prepare('SELECT COUNT(*) AS c FROM lab_workflow_webhook_captures').get()).toEqual({ c: 1 });
    db.close();
  });
});
