/**
 * Phase 10 — read-only inventory of Forms Builder / Chart Builder app DB tables
 * used by integration bindings (connectors, published forms, chart definitions).
 *
 * Full table dumps are intentionally not committed here; bindings reference stable
 * `formKey` / connector ids authored in `*-binding-seeds.ts`. Use this script to
 * compare a golden machine against expectations before updating those modules.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const PROVIDER_DBS: Array<{ appId: string; relativePath: string; tables: string[] }> = [
  {
    appId: 'forms-builder',
    relativePath: 'src/apps/forms-builder/db/the_lab.db',
    tables: ['connectors', 'forms', 'form_versions'],
  },
  {
    appId: 'chart-builder',
    relativePath: 'src/apps/chart-builder/db/the_lab.db',
    tables: ['data_connectors', 'charts'],
  },
];

function tableCount(db: Database.Database, table: string): number | null {
  const exists = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table);
  if (!exists) {
    return null;
  }
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
  return row.c;
}

function main(): void {
  const cwd = process.cwd();
  const report = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    providers: PROVIDER_DBS.map((entry) => {
      const fullPath = path.join(cwd, entry.relativePath);
      if (!existsSync(fullPath)) {
        return { appId: entry.appId, path: fullPath, present: false, tables: {} };
      }
      const db = new Database(fullPath, { readonly: true });
      try {
        const tables: Record<string, number | null> = {};
        for (const table of entry.tables) {
          tables[table] = tableCount(db, table);
        }
        return { appId: entry.appId, path: fullPath, present: true, tables };
      } finally {
        db.close();
      }
    }),
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
