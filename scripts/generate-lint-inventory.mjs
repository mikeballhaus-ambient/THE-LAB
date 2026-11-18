#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const eslintBin = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
const result = spawnSync(process.execPath, [eslintBin, '.', '--format', 'json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});

if (result.status !== 0 && !result.stdout) {
  console.error(result.stderr);
  process.exit(1);
}

const json = JSON.parse(result.stdout);
const files = json.filter((f) => f.errorCount > 0);
const byRule = {};
const byArea = {};
const fileSummaries = [];

for (const f of files) {
  const rel = path.relative(root, f.filePath).replace(/\\/g, '/');
  let area = 'other';
  if (rel.startsWith('src/apps/')) {
    const parts = rel.split('/');
    area = `apps/${parts[2] || 'unknown'}`;
  } else if (rel.startsWith('src/backend/')) area = 'backend';
  else if (rel.startsWith('src/dashboard/')) area = 'dashboard';
  else if (rel.startsWith('src/shared/')) area = 'shared';
  else if (rel.startsWith('src/tests/')) area = 'tests';
  else if (rel.startsWith('src/services/')) area = 'services';
  else if (rel.startsWith('scripts/')) area = 'scripts';
  else if (rel.startsWith('src/scripts/')) area = 'src/scripts';

  const rules = {};
  for (const m of f.messages) {
    if (m.severity !== 2) continue;
    byRule[m.ruleId] = (byRule[m.ruleId] || 0) + 1;
    rules[m.ruleId] = (rules[m.ruleId] || 0) + 1;
  }
  byArea[area] = (byArea[area] || 0) + f.errorCount;
  const messages = f.messages
    .filter((m) => m.severity === 2)
    .map((m) => ({
      line: m.line,
      column: m.column,
      ruleId: m.ruleId,
      message: m.message,
    }));
  fileSummaries.push({ file: rel, errors: f.errorCount, rules, messages });
}

fileSummaries.sort((a, b) => b.errors - a.errors || a.file.localeCompare(b.file));

const payload = {
  generatedAt: new Date().toISOString(),
  totalErrors: files.reduce((a, f) => a + f.errorCount, 0),
  fileCount: files.length,
  byRule: Object.entries(byRule).sort((a, b) => b[1] - a[1]),
  byArea: Object.entries(byArea).sort((a, b) => b[1] - a[1]),
  files: fileSummaries,
};

const outDir = path.join(root, 'plans', 'lab-lint-fixes', 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'lint-inventory.json'), JSON.stringify(payload, null, 2));

const detailLines = ['# Lint errors (line-level)', '', `Generated: ${payload.generatedAt}`, ''];
for (const f of fileSummaries) {
  detailLines.push(`## \`${f.file}\` (${f.errors})`, '');
  for (const m of f.messages) {
    detailLines.push(
      `- L${m.line}:${m.column} **\`${m.ruleId}\`** — ${m.message.replace(/\|/g, '\\|')}`,
    );
  }
  detailLines.push('');
}
fs.writeFileSync(path.join(outDir, 'lint-errors-line-level.md'), detailLines.join('\n'));

const lines = [
  '# Lint inventory (full `npm run lint`)',
  '',
  `Generated: ${payload.generatedAt}`,
  '',
  '| Metric | Value |',
  '|--------|------:|',
  `| Files | ${payload.fileCount} |`,
  `| Errors | ${payload.totalErrors} |`,
  '',
  '## By rule',
  '',
  '| Rule | Count |',
  '|------|------:|',
  ...payload.byRule.map(([rule, c]) => `| \`${rule}\` | ${c} |`),
  '',
  '## By area',
  '',
  '| Area | Errors |',
  '|------|------:|',
  ...payload.byArea.map(([area, c]) => `| ${area} | ${c} |`),
  '',
  '## Per file',
  '',
];

for (const f of fileSummaries) {
  const ruleStr = Object.entries(f.rules)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
  lines.push(`- \`${f.file}\` — **${f.errors}** (${ruleStr})`);
}

fs.writeFileSync(path.join(outDir, 'lint-inventory.md'), lines.join('\n'));
console.log(`Wrote ${payload.fileCount} files, ${payload.totalErrors} errors`);
