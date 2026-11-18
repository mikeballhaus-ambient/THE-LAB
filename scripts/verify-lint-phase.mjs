#!/usr/bin/env node
/**
 * Gate for lab-lint-fixes local executor: every path in a phase manifest must be lint-clean.
 *
 * Usage:
 *   npm run verify-lint-phase -- 02-scripts-vite
 *   npm run verify-lint-phase -- 02
 *
 * Phase 01 (inventory only) has no manifest — exits 0 with a reminder.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifestsDir = path.join(root, 'plans/lab-lint-fixes/docs/manifests');

const rawArg = process.argv[2];
if (!rawArg) {
  console.error('Usage: npm run verify-lint-phase -- <phase-id>');
  console.error('Example: npm run verify-lint-phase -- 02-scripts-vite');
  process.exit(1);
}

function resolvePhaseId(arg) {
  if (arg === '01' || arg === '01-inventory-baseline' || arg === '01-inventory') {
    return '01-inventory';
  }
  if (arg === '14' || arg === '14-final-verification' || arg === '14-final') {
    return '14-final';
  }
  const direct = path.join(manifestsDir, `${arg}.md`);
  if (fs.existsSync(direct)) return arg;
  if (/^\d{2}$/.test(arg)) {
    const match = fs
      .readdirSync(manifestsDir)
      .find((f) => f.startsWith(`${arg}-`) && f.endsWith('.md'));
    if (match) return match.replace(/\.md$/, '');
  }
  return null;
}

const resolved = resolvePhaseId(rawArg);
if (!resolved) {
  console.error(`Unknown phase: ${rawArg}`);
  process.exit(1);
}

if (resolved === '01-inventory') {
  console.log('Phase 01 is inventory-only — no manifest. Run generate-lint-inventory scripts; do not edit src/.');
  process.exit(0);
}

if (resolved === '14-final') {
  console.log('Phase 14: run npm run lint, lint:ci, type-check:ci, test — not verify-lint-phase.');
  process.exit(0);
}

const manifestPath = path.join(manifestsDir, `${resolved}.md`);
const manifestText = fs.readFileSync(manifestPath, 'utf8');
const files = [];
for (const line of manifestText.split('\n')) {
  const m = line.match(/^- `([^`]+)`/);
  if (m) files.push(m[1]);
}

if (files.length === 0) {
  console.error(`No file paths parsed from ${manifestPath}`);
  process.exit(1);
}

console.log(`\n=== verify-lint-phase: ${resolved} (${files.length} files) ===\n`);

let failed = 0;
for (const rel of files) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`MISSING: ${rel}`);
    failed += 1;
    continue;
  }
  let out = '';
  try {
    out = execSync(`npm run lint-file "${rel}"`, { encoding: 'utf8', cwd: root, stdio: 'pipe' });
  } catch (err) {
    out = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '');
  }
  if (out.includes('No ESLint errors.')) {
    console.log(`OK   ${rel}`);
  } else {
    console.error(`FAIL ${rel}`);
    const snippet = out.split('\n').slice(0, 8).join('\n');
    if (snippet.trim()) console.error(snippet);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\nverify-lint-phase: ${failed} file(s) not clean — phase NOT complete.\n`);
  process.exit(1);
}

console.log(`\nverify-lint-phase: all ${files.length} manifest paths lint-clean.\n`);
process.exit(0);
