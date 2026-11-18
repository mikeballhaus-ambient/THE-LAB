/**
 * Commit live demo workflow rows from the main DB into repo seeds.
 *
 * See docs/platform/demo-workflow-db-seed-sync.md
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  DEMO_WORKFLOW_DB_SYNC_ENTRIES,
  demoWorkflowDbSyncEntryById,
  demoWorkflowDbSyncEntryBySlug,
  type DemoWorkflowDbSyncEntry,
} from '@/shared/seeds/demo-workflows/demo-workflow-db-sync-manifest';
import {
  openMainLabDatabaseReadonly,
  readDemoWorkflowFromDb,
  type DemoWorkflowDbExportRow,
} from './lib/demo-workflow-db-export';

const ROOT = process.cwd();
const SNAPSHOT_DIR = path.join(ROOT, 'src/shared/seeds/demo-workflows/snapshots');
const CATALOG_PATH = path.join(ROOT, 'src/shared/utils/demo-workflow-seed-catalog.ts');
const UTILS_DIR = path.join(ROOT, 'src/shared/utils');

type CliArgs = {
  id?: string;
  slug?: string;
  all: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { all: false, dryRun: false };
  for (const arg of argv) {
    if (arg === '--all') {
      args.all = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg.startsWith('--id=')) {
      args.id = arg.slice('--id='.length);
    } else if (arg.startsWith('--slug=')) {
      args.slug = arg.slice('--slug='.length);
    }
  }
  return args;
}

function resolveEntries(args: CliArgs): DemoWorkflowDbSyncEntry[] {
  if (args.all) {
    return [...DEMO_WORKFLOW_DB_SYNC_ENTRIES];
  }
  if (args.id) {
    const entry = demoWorkflowDbSyncEntryById(args.id);
    if (!entry) {
      throw new Error(`unknown demo workflow id: ${args.id}`);
    }
    return [entry];
  }
  if (args.slug) {
    const entry = demoWorkflowDbSyncEntryBySlug(args.slug);
    if (!entry) {
      throw new Error(`unknown slug: ${args.slug}`);
    }
    return [entry];
  }
  throw new Error('pass --slug, --id, or --all');
}

function snapshotConstName(slug: string): string {
  return `DEMO_WORKFLOW_${slug.replace(/-/g, '_').toUpperCase()}_SNAPSHOT`;
}

function snapshotImportBasename(snapshotFile: string): string {
  return snapshotFile.replace(/\.ts$/, '');
}

function writeSnapshotFile(row: DemoWorkflowDbExportRow, entry: DemoWorkflowDbSyncEntry): string {
  const constName = snapshotConstName(entry.slug);
  const payload = {
    id: row.id,
    name: row.name,
    description: row.description,
    priority: row.priority,
    definition: row.definition,
    exportedAt: new Date().toISOString(),
  };
  return `import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run \`npm run apply:demo-workflow-seeds\`. */
export const ${constName} = ${JSON.stringify(payload, null, 2)} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
`;
}

function patchCatalogMetadata(row: DemoWorkflowDbExportRow, entry: DemoWorkflowDbSyncEntry): string {
  const source = readFileSync(CATALOG_PATH, 'utf8');
  let start = source.indexOf(`id: ${entry.catalogIdSymbol},`);
  if (start < 0) {
    const buildMarker = `buildDefinition: ${entry.buildFunctionName},`;
    const buildIdx = source.indexOf(buildMarker);
    if (buildIdx < 0) {
      throw new Error(`catalog entry not found for id ${row.id}`);
    }
    start = source.lastIndexOf('id:', buildIdx);
    if (start < 0) {
      throw new Error(`catalog id line not found for ${entry.buildFunctionName}`);
    }
  }
  const blockEnd = source.indexOf('},', start);
  if (blockEnd < 0) {
    throw new Error(`catalog block end not found for id ${row.id}`);
  }
  let block = source.slice(start, blockEnd);
  block = block.replace(/name: '([^'\\]|\\.)*'/, `name: '${row.name.replace(/'/g, "\\'")}'`);
  block = block.replace(/priority: \d+/, `priority: ${row.priority}`);
  return source.slice(0, start) + block + source.slice(blockEnd);
}

/**
 * Rewire the definition module to build from the committed snapshot.
 *
 * Takes only `entry`: the module is regenerated from the snapshot file, so it needs the module path
 * and function name, not the DB row. The previous `row` parameter was never read.
 */
function ensureSnapshotDrivenDefinitionModule(entry: DemoWorkflowDbSyncEntry): string {
  const modulePath = path.join(UTILS_DIR, `${entry.definitionModuleBasename}.ts`);
  let source = readFileSync(modulePath, 'utf8');
  const buildName = entry.buildFunctionName;
  const constName = snapshotConstName(entry.slug);
  const snapshotImport = `import { ${constName} } from '@/shared/seeds/demo-workflows/snapshots/${snapshotImportBasename(entry.snapshotFile)}';`;

  if (!source.includes(snapshotImport)) {
    const graphImportEnd = source.indexOf("from '@/shared/types/lab-workflow-graph'");
    const lineEnd = source.indexOf('\n', graphImportEnd);
    source = source.slice(0, lineEnd + 1) + snapshotImport + '\n' + source.slice(lineEnd + 1);
  }

  const arrangeImport =
    "import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';\n";
  const viewportImport =
    "import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';\n";
  if (!source.includes('autoArrangeLabWorkflowGraph')) {
    const graphImportEnd = source.indexOf("from '@/shared/types/lab-workflow-graph'");
    const lineEnd = source.indexOf('\n', graphImportEnd);
    source = source.slice(0, lineEnd + 1) + arrangeImport + source.slice(lineEnd + 1);
  }
  if (!source.includes('arrangeSeedLayoutIfUnpositioned')) {
    const graphImportEnd = source.indexOf("from '@/shared/types/lab-workflow-graph'");
    const lineEnd = source.indexOf('\n', graphImportEnd);
    source = source.slice(0, lineEnd + 1) + viewportImport + source.slice(lineEnd + 1);
  }

  const fnMarker = `export function ${buildName}`;
  const fnStart = source.indexOf(fnMarker);
  if (fnStart < 0) {
    throw new Error(`${fnMarker} not found in ${modulePath}`);
  }

  const bodyStart = source.indexOf('{', fnStart);
  let depth = 0;
  let fnEnd = -1;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') {
      depth += 1;
    } else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        fnEnd = i + 1;
        break;
      }
    }
  }
  if (fnEnd < 0) {
    throw new Error(`could not parse ${buildName} body`);
  }

  const newFn = `export function ${buildName}(): import('@/shared/types/lab-workflow-graph').LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = ${constName}.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}`;

  return source.slice(0, fnStart) + newFn + source.slice(fnEnd);
}

async function applyOne(
  entry: DemoWorkflowDbSyncEntry,
  dryRun: boolean,
): Promise<{ slug: string; wrote: string[] }> {
  const db = await openMainLabDatabaseReadonly();
  let row: DemoWorkflowDbExportRow | null;
  try {
    row = readDemoWorkflowFromDb(db, entry);
  } finally {
    db.close();
  }
  if (!row) {
    throw new Error(`workflow ${entry.id} not found in database`);
  }

  const snapshotPath = path.join(SNAPSHOT_DIR, entry.snapshotFile);
  const snapshotBody = writeSnapshotFile(row, entry);
  const catalogBody = patchCatalogMetadata(row, entry);
  const definitionBody = ensureSnapshotDrivenDefinitionModule(entry);

  const wrote: string[] = [];
  if (dryRun) {
    console.log(`[dry-run] would write ${path.relative(ROOT, snapshotPath)}`);
    console.log(`[dry-run] would update ${path.relative(ROOT, CATALOG_PATH)}`);
    console.log(`[dry-run] would patch ${entry.definitionModuleBasename}.ts`);
    return { slug: entry.slug, wrote };
  }

  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  writeFileSync(snapshotPath, snapshotBody, 'utf8');
  wrote.push(snapshotPath);
  writeFileSync(CATALOG_PATH, catalogBody, 'utf8');
  wrote.push(CATALOG_PATH);
  const defPath = path.join(UTILS_DIR, `${entry.definitionModuleBasename}.ts`);
  writeFileSync(defPath, definitionBody, 'utf8');
  wrote.push(defPath);

  return { slug: entry.slug, wrote };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const entries = resolveEntries(args);
  const results = [];
  for (const entry of entries) {
    results.push(await applyOne(entry, args.dryRun));
  }
  console.log(JSON.stringify({ ok: true, dryRun: args.dryRun, applied: results }, null, 2));
}

main().catch((err) => {
  console.error('[apply:demo-workflow-seeds] failed:', err);
  process.exit(1);
});
