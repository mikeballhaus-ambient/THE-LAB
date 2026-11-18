/**
 * Verify the two test tiers are well-formed. Runs in CI before `test:ci`.
 *
 *   npm run verify:test-tiers
 *
 * Two groupings, deliberately asymmetric:
 *   `npm run test:ci`          -> only `src/tests/ci/**`        (Azure PR gate — the slim set)
 *   `npm run test:regression`  -> EVERYTHING Jest resolves      (full lab regression, run locally)
 *
 * The fast tier is a subset of the full regression, not a sibling of it. `src/tests/regression/**`
 * is simply where the suites excluded from the fast tier live; the full run still picks up both
 * directories.
 *
 * Invariants checked:
 *   1. Every suite Jest resolves lives under `src/tests/ci/` or `src/tests/regression/` — no
 *      untiered suite, no overlap.
 *   2. `test:ci` resolves to exactly the `src/tests/ci/**` set.
 *   3. `test:regression` resolves to the same count as a bare `jest --listTests` (i.e. it really is
 *      the full suite, including the ci tier).
 *   4. No suite under `src/tests/ci/` imports real SQLite, imports `@/backend/**`, or boots the
 *      MCP registry / AppManager. This is what keeps the gate fast and OOM-free.
 *   5. The excluded areas (workflow-engine, mcp-tools, ui-automation) never appear in the ci tier.
 *
 * Exits non-zero with a per-file report on violation.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const CI_DIR = 'src/tests/ci/';
const REG_DIR = 'src/tests/regression/';

/** Areas that must never appear in the fast tier, even when individually pure. */
const CI_EXCLUDED_AREAS = [
  ['workflow-engine', /lab-workflow|validate-lab-workflow/],
  ['mcp-tools', /\/mcp\//],
  ['ui-automation', /ui-automation/],
];

/** Real-resource markers that disqualify a suite from the fast tier. */
const IMPURE_MARKERS = [
  ['real-sqlite', /better-sqlite3|AppDatabaseService|databaseManager/],
  ['backend-import', /from\s+'(?:@\/backend|better-sqlite3)/],
  ['boots-runtime', /backend-entry|AppManager\.|MCPToolRegistry|\.initialize\(\)/],
];

function listSuites(extraArgs = []) {
  const out = execFileSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      path.join(REPO, 'node_modules', 'jest', 'bin', 'jest.js'),
      '--listTests',
      ...extraArgs,
    ],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((abs) => path.relative(REPO, abs).replace(/\\/g, '/'));
}

const failures = [];
const fail = (msg) => failures.push(msg);

const all = listSuites();
const ci = all.filter((f) => f.startsWith(CI_DIR));
const regression = all.filter((f) => f.startsWith(REG_DIR));
const untiered = all.filter((f) => !f.startsWith(CI_DIR) && !f.startsWith(REG_DIR));

// 1. Partition — every suite in exactly one tier.
if (untiered.length) {
  fail(
    `${untiered.length} suite(s) in neither tier (move to src/tests/ci or src/tests/regression):\n` +
      untiered.map((f) => `    ${f}`).join('\n'),
  );
}
if (ci.length + regression.length !== all.length) {
  fail(`tiers do not partition: ci ${ci.length} + regression ${regression.length} !== total ${all.length}`);
}
const overlap = ci.filter((f) => regression.includes(f));
if (overlap.length) fail(`suites in both tiers: ${overlap.join(', ')}`);

// 2 + 3. The fast tier stays fast and stays out of the excluded areas.
for (const rel of ci) {
  const source = fs.readFileSync(path.join(REPO, rel), 'utf8');
  for (const [name, re] of IMPURE_MARKERS) {
    if (re.test(source)) fail(`[ci tier] ${rel} is not pure — matched ${name}`);
  }
  for (const [name, re] of CI_EXCLUDED_AREAS) {
    if (re.test(rel)) fail(`[ci tier] ${rel} belongs to excluded area "${name}"`);
  }
}

// 4 + 5. The npm scripts resolve as intended: ci = the narrow set, regression = everything.
const viaCiPattern = listSuites(['--testPathPatterns', `/${CI_DIR}`]).length;
if (viaCiPattern !== ci.length) {
  fail(`test:ci pattern resolves ${viaCiPattern} suites; directory scan found ${ci.length}`);
}

// `test:regression` runs a bare `jest`, so it must see every suite — ci tier included.
const viaRegression = listSuites().length;
if (viaRegression !== all.length) {
  fail(`test:regression resolves ${viaRegression} suites but jest sees ${all.length} — it must be the full set`);
}

const pct = ((ci.length / all.length) * 100).toFixed(0);
console.log(`total suites:            ${all.length}`);
console.log(`  test:ci        (gate): ${ci.length}  (${pct}% of the suite)`);
console.log(`  test:regression (all): ${viaRegression}  (full lab regression)`);
console.log(`  ci dir:                ${ci.length}`);
console.log(`  regression dir:        ${regression.length}`);
console.log(`  untiered:              ${untiered.length}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\nOK — tiers partition cleanly; the ci tier has no SQLite and no backend boot.');
