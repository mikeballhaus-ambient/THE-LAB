/**
 * One-time migration: split `src/tests/**` into `src/tests/ci/**` and `src/tests/regression/**`.
 *
 *   node scripts/migrate-test-tiers.mjs --dry-run
 *   node scripts/migrate-test-tiers.mjs --apply
 *
 * Classification comes from `scripts/lib/test-tiers.mjs` — no file list is hardcoded here.
 * Subpaths beneath `src/tests/` are preserved, so the one relative import in the tree
 * (`./__fixtures__/word-tile-prompt-golden.json`) keeps resolving; everything else uses the `@/`
 * alias, which is location-independent.
 *
 * After this runs, the tier IS the path and no classification happens at run time.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { classify, targetPath } from './lib/test-tiers.mjs';

const REPO = process.cwd();
const TESTS = path.join(REPO, 'src', 'tests');
const APPLY = process.argv.includes('--apply');

/**
 * Colocated fixture directories follow their tests. Top-level support dirs (`mocks`, `helpers`,
 * `e2e`) and `jest.env.setup.ts` stay where they are — they are referenced by absolute path from
 * `jest.config.cjs` / `playwright.config.ts`, so moving them would break resolution.
 */
const SUPPORT_DIRS = new Set(['__fixtures__', '__mocks__']);

function listSuites() {
  const out = execFileSync(
    process.execPath,
    ['--experimental-vm-modules', path.join(REPO, 'node_modules', 'jest', 'bin', 'jest.js'), '--listTests'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((abs) => path.relative(REPO, abs).replace(/\\/g, '/'));
}

const plan = listSuites().map((rel) => {
  const source = fs.readFileSync(path.join(REPO, rel), 'utf8');
  const { tier, reason } = classify(rel, source);
  return { rel, tier, reason, target: targetPath(rel, tier) };
});

// Support code (fixtures, mocks, helpers, e2e) is not a suite; it moves with the tier that
// references it. Directories are resolved after the suites so the tier is known.
const supportDirs = [];
(function findSupport(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(dir, entry.name);
    // Only consider support dirs that live under src/tests, not nested app fixtures.
    if (SUPPORT_DIRS.has(entry.name)) {
      const parentSuiteTiers = plan
        .filter((p) => p.rel.startsWith(path.relative(REPO, abs).replace(/\\/g, '/').replace(/\/[^/]+$/, '')))
        .map((p) => p.tier);
      const tier = parentSuiteTiers.includes('ci') ? 'ci' : 'regression';
      supportDirs.push({ from: path.relative(REPO, abs).replace(/\\/g, '/'), tier });
      continue;
    }
    findSupport(abs);
  }
})(TESTS);

const ci = plan.filter((p) => p.tier === 'ci');
const reg = plan.filter((p) => p.tier === 'regression');

console.log(`mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
console.log(`suites: ${plan.length}`);
console.log(`  ci:         ${ci.length}  (${((ci.length / plan.length) * 100).toFixed(0)}%)`);
console.log(`  regression: ${reg.length}`);
console.log(`support dirs to move: ${supportDirs.length}`);

const reasons = {};
for (const p of reg) reasons[p.reason] = (reasons[p.reason] || 0) + 1;
console.log('\nregression reasons:');
for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${r}`);
}

const collisions = plan.filter((p) => fs.existsSync(path.join(REPO, p.target)));
if (collisions.length) {
  console.error(`\nABORT — ${collisions.length} target(s) exist:`);
  for (const c of collisions) console.error(`  ${c.target}`);
  process.exit(1);
}

if (!APPLY) {
  console.log('\nsample ci moves:');
  for (const p of ci.slice(0, 3)) console.log(`  ${p.rel}\n    -> ${p.target}`);
  console.log('\nsample regression moves:');
  for (const p of reg.slice(0, 3)) console.log(`  ${p.rel}\n    -> ${p.target}`);
  console.log('\nDry run complete. Re-run with --apply.');
  process.exit(0);
}

function gitMv(from, to) {
  fs.mkdirSync(path.dirname(path.join(REPO, to)), { recursive: true });
  try {
    execFileSync('git', ['mv', from, to], { cwd: REPO, stdio: 'pipe' });
  } catch {
    fs.renameSync(path.join(REPO, from), path.join(REPO, to));
  }
}

for (const p of plan) gitMv(p.rel, p.target);

for (const dir of supportDirs) {
  const sub = dir.from.replace(/^src\/tests\//, '');
  gitMv(dir.from, path.posix.join('src/tests', dir.tier, sub));
}

console.log('\nMoves applied. Remaining entries under src/tests:');
for (const entry of fs.readdirSync(TESTS, { withFileTypes: true })) {
  console.log(`  ${entry.isDirectory() ? '[dir] ' : '[file]'} ${entry.name}`);
}
