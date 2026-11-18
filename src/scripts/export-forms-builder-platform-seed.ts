import Database from 'better-sqlite3';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dbPath = join(root, 'src/apps/forms-builder/db/the_lab.db');
const outPath = join(root, 'src/apps/forms-builder/back-end/db/platform-forms-seed-data.ts');

const db = new Database(dbPath, { readonly: true });
const connectors = db.prepare('SELECT * FROM data_connectors ORDER BY id').all();
const forms = db.prepare('SELECT * FROM forms ORDER BY id').all();

const out = `/** Auto-exported platform forms seed — regenerate: npx tsx src/scripts/export-forms-builder-platform-seed.ts */
export const PLATFORM_FORMS_SEED_CONNECTORS: ReadonlyArray<Record<string, unknown>> = ${JSON.stringify(connectors, null, 2)};

export const PLATFORM_FORMS_SEED_FORMS: ReadonlyArray<Record<string, unknown>> = ${JSON.stringify(forms, null, 2)};
`;

writeFileSync(outPath, out, 'utf8');
console.log(`Wrote ${connectors.length} connectors and ${forms.length} forms to ${outPath}`);
