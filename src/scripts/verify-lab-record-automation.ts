/**
 * rm-68.2 gate — flags list-action DOM that breaks Sidecar UI automation.
 *
 * 1. Static generateUniqueId('…edit'|'…delete') in .vue (duplicate ids in v-for tables).
 * 2. Catalog / settings .vue with pi-pencil or pi-trash but no lab-record automation import.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SCAN_DIRS = [
  path.join(ROOT, 'src/apps'),
  path.join(ROOT, 'src/dashboard'),
].filter((d) => fs.existsSync(d));

function isSuspiciousStaticRowActionLiteral(literal: string): boolean {
  if (literal.includes('${')) return false;
  if (/preview-|dialog|cancel-|editor/.test(literal)) return false;
  if (/^(edit|delete|del)$/.test(literal)) return true;
  return /-(edit|delete|del)$/.test(literal);
}

/** String or backtick literal **without** `${recordId}` — duplicate ids in v-for. */
function hasStaticRowActionId(source: string): string | null {
  const stringLiteral = /generateUniqueId\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m1: RegExpExecArray | null;
  while ((m1 = stringLiteral.exec(source)) !== null) {
    if (isSuspiciousStaticRowActionLiteral(m1[1])) return m1[0];
  }

  const templateLiteral = /generateUniqueId\s*\(\s*`([^`]*)`\s*\)/g;
  let m2: RegExpExecArray | null;
  while ((m2 = templateLiteral.exec(source)) !== null) {
    if (isSuspiciousStaticRowActionLiteral(m2[1])) return m2[0];
  }
  return null;
}

const RECORD_AUTOMATION_IMPORT =
  /labRecordActionButtonPt|labRecordActionRootAttrs|LabRecordRowActions/;

const ICON_ROW_ACTION = /icon="pi pi-(pencil|trash)"/;

/** Designer / graph chrome — not catalog list CRUD (rm-68.2 triage). */
const MISSING_IMPORT_EXEMPT_PATH_PARTS = [
  'dashboard/components/settings/lab-workflows/',
  'PropertyEditor.vue',
  'DesignCanvas.vue',
  'FormSubmissionDisplay.vue',
  'MessageInput.vue',
  'LabRuleDefinitionEditor.vue',
  'LabNotificationsDialog.vue',
  'EntityAdmin.vue',
];

function collectVueFiles(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      collectVueFiles(full, out);
    } else if (name.endsWith('.vue')) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  kind: 'static_row_id' | 'missing_record_import';
  detail: string;
}

const findings: Finding[] = [];

for (const dir of SCAN_DIRS) {
  for (const file of collectVueFiles(dir)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const text = fs.readFileSync(file, 'utf8');

    const staticMatch = hasStaticRowActionId(text);
    if (staticMatch) {
      const line =
        text.split('\n').find((l) => l.includes(staticMatch.slice(0, 40)))?.trim() ?? staticMatch;
      findings.push({
        file: rel,
        kind: 'static_row_id',
        detail: line.slice(0, 120),
      });
    }

    const isGame =
      rel.includes('/chess/') ||
      rel.includes('/checkers/') ||
      rel.includes('/billiards/') ||
      rel.includes('/blackjack/') ||
      rel.includes('/battleship/') ||
      rel.includes('/hangman/') ||
      rel.includes('/poker/') ||
      rel.includes('/tic-tac-toe/') ||
      rel.includes('/connect-four/') ||
      rel.includes('/word-tile/') ||
      rel.includes('/solitaire/') ||
      rel.includes('/tile-word-grid/');

    const exemptMissing = MISSING_IMPORT_EXEMPT_PATH_PARTS.some((part) => rel.includes(part.replace(/\\/g, '/')));
    if (
      !isGame &&
      !exemptMissing &&
      ICON_ROW_ACTION.test(text) &&
      !RECORD_AUTOMATION_IMPORT.test(text)
    ) {
      findings.push({
        file: rel,
        kind: 'missing_record_import',
        detail: 'Has row icon actions but no lab-record automation helper',
      });
    }
  }
}

const staticFindings = findings.filter((f) => f.kind === 'static_row_id');
const missingImport = findings.filter((f) => f.kind === 'missing_record_import');

if (missingImport.length > 0) {
  console.log(
    `[verify:record-automation] backlog: ${missingImport.length} file(s) with icon row actions but no lab-record import`,
  );
  for (const f of missingImport) {
    console.log(`  ${f.file}`);
  }
}

if (staticFindings.length === 0) {
  console.log('[verify:record-automation] OK — no duplicate static row action ids');
  process.exit(0);
}

console.error(`[verify:record-automation] ${staticFindings.length} static row id defect(s):\n`);
for (const f of staticFindings) {
  console.error(`  ${f.file}`);
  console.error(`    ${f.detail}\n`);
}
process.exit(1);
