/**
 * Phase 10 — read-only report of `lab_integration_bindings` in the live main DB.
 *
 * Does not rewrite TypeScript seed modules (bindings are code-first). Use this before/after
 * wizard changes to spot drift from `seed-binding-*` ids.
 *
 * Usage: npm run export:integration-seeds
 * Env: DATABASE_PATH (default db/the_lab.db)
 */
import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { getDatabasePath } from '@/shared/config/database';
import { readIntegrationBindingsForExport } from '@/backend/lab-integrations/verify-integration-seed-pack';

async function main(): Promise<void> {
  const dbPath = await getDatabasePath();
  if (!existsSync(dbPath)) {
    console.error(`[export:integration-seeds] database not found: ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    const table = db
      .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'lab_integration_bindings'`)
      .get();
    if (!table) {
      console.error('[export:integration-seeds] lab_integration_bindings table missing');
      process.exit(1);
    }

    const bindings = readIntegrationBindingsForExport(db);
    const byHost = new Map<string, number>();
    let seedAuthored = 0;
    for (const row of bindings) {
      byHost.set(row.hostAppId, (byHost.get(row.hostAppId) ?? 0) + 1);
      if (row.id.startsWith('seed-')) {
        seedAuthored += 1;
      }
    }

    const report = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      databasePath: dbPath,
      bindingCount: bindings.length,
      seedAuthoredCount: seedAuthored,
      nonSeedCount: bindings.length - seedAuthored,
      hosts: Object.fromEntries([...byHost.entries()].sort(([a], [b]) => a.localeCompare(b))),
      bindings,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('[export:integration-seeds] unexpected error:', err);
  process.exit(1);
});
