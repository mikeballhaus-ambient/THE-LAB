/**
 * Read demo workflow rows from the main lab DB (`lab_workflows` ids in demo-workflow-seed-catalog).
 *
 * Does not modify the database or TypeScript seeds. Use `apply:demo-workflow-seeds` to commit exports.
 *
 * Usage:
 *   npm run export:demo-workflows
 *   npm run export:demo-workflows -- --id=a1000002-0002-4002-8002-000000000070
 *   npm run export:demo-workflows -- --slug=webhook-loop
 *
 * Env: DATABASE_PATH (default db/the_lab.db)
 */
import {
  demoWorkflowDbSyncEntryById,
  demoWorkflowDbSyncEntryBySlug,
} from '@/shared/seeds/demo-workflows/demo-workflow-db-sync-manifest';
import {
  openMainLabDatabaseReadonly,
  readAllDemoWorkflowsFromDb,
  readDemoWorkflowFromDb,
  type DemoWorkflowDbExportReport,
} from './lib/demo-workflow-db-export';

function parseArgs(argv: string[]): { id?: string; slug?: string; stripLayout: boolean } {
  let id: string | undefined;
  let slug: string | undefined;
  let stripLayout = false;
  for (const arg of argv) {
    if (arg.startsWith('--id=')) {
      id = arg.slice('--id='.length);
    } else if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length);
    } else if (arg === '--strip-layout') {
      stripLayout = true;
    }
  }
  return { id, slug, stripLayout };
}

async function main(): Promise<void> {
  const { id, slug, stripLayout } = parseArgs(process.argv.slice(2));
  const readOptions = { preserveCanvasLayout: !stripLayout };
  const db = await openMainLabDatabaseReadonly();
  try {
    let workflows;
    if (id) {
      const entry = demoWorkflowDbSyncEntryById(id);
      if (!entry) {
        console.error(`[export:demo-workflows] unknown demo workflow id: ${id}`);
        process.exit(1);
      }
      const row = readDemoWorkflowFromDb(db, entry, readOptions);
      if (!row) {
        console.error(`[export:demo-workflows] workflow not in database: ${id}`);
        process.exit(1);
      }
      workflows = [row];
    } else if (slug) {
      const entry = demoWorkflowDbSyncEntryBySlug(slug);
      if (!entry) {
        console.error(`[export:demo-workflows] unknown slug: ${slug}`);
        process.exit(1);
      }
      const row = readDemoWorkflowFromDb(db, entry, readOptions);
      if (!row) {
        console.error(`[export:demo-workflows] workflow not in database for slug: ${slug}`);
        process.exit(1);
      }
      workflows = [row];
    } else {
      workflows = readAllDemoWorkflowsFromDb(db, readOptions);
    }

    const report: DemoWorkflowDbExportReport = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      databasePath: db.name,
      workflows,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('[export:demo-workflows] unexpected error:', err);
  process.exit(1);
});
