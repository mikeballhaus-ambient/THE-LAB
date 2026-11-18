#!/usr/bin/env node
/**
 * Gate for planner/reviewer agents: ensure a handoff sample at a repo path
 * passes type-check, lint, and (for *.test.ts) Jest.
 *
 * Usage: npm run verify-handoff-path -- "src/tests/foo.test.ts"
 *
 * Note: type-check-file and lint-file exit 0 even when they print errors;
 * this script parses output and exits 1 on failure.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Usage: npm run verify-handoff-path -- "<repo-relative-path>"');
  process.exit(1);
}

const normalized = fileArg.split(path.sep).join('/');
let failed = false;

function runCapture(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    const stdout = err.stdout?.toString() ?? '';
    const stderr = err.stderr?.toString() ?? '';
    return stdout + stderr;
  }
}

console.log(`\n=== verify-handoff-path: ${normalized} ===\n`);

console.log('— type-check-file —');
const typeOut = runCapture(`npm run type-check-file "${normalized}"`);
console.log(typeOut.trim());
if (!typeOut.includes('No TypeScript errors for this file.')) {
  console.error('FAIL: type-check-file reported errors (or unexpected output).');
  failed = true;
}

console.log('\n— lint-file —');
const lintOut = runCapture(`npm run lint-file "${normalized}"`);
console.log(lintOut.trim());
if (!lintOut.includes('No ESLint errors.')) {
  console.error('FAIL: lint-file reported errors (or unexpected output).');
  failed = true;
}

if (/\.test\.(ts|tsx)$/.test(normalized)) {
  const testPattern = path.basename(normalized).replace(/\.test\.(ts|tsx)$/, '');
  console.log(`\n— test:path "${testPattern}" —`);
  try {
    execSync(`npm run test:path "${testPattern}"`, { stdio: 'inherit' });
  } catch {
    console.error('FAIL: test:path exited non-zero.');
    failed = true;
  }
}

if (failed) {
  console.error(`\nverify-handoff-path: FAILED for ${normalized}`);
  process.exit(1);
}

console.log(`\nverify-handoff-path: OK for ${normalized}`);
process.exit(0);
