/**
 * Canonical test-tier rules. Imported by `migrate-test-tiers.mjs` (one-time move) and
 * `verify-test-tiers.mjs` (CI gate). One definition, so the tiers cannot disagree.
 *
 * Tier layout after migration is purely directory-based:
 *   src/tests/ci/**          -> `npm run test:ci`       (Azure PR gate)
 *   src/tests/regression/**  -> `npm run test:regression` (full lab regression, local)
 *
 * The rules below are only used to decide where each existing suite lands. After the move, the
 * path *is* the tier and no classification happens at run time.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Real-resource markers. Any hit disqualifies a suite from the fast tier. */
export const IMPURE_MARKERS = [
  ['real-sqlite', /better-sqlite3|AppDatabaseService|databaseManager/],
  ['backend-import', /from\s+'(?:@\/backend|better-sqlite3)/],
  ['boots-runtime', /backend-entry|AppManager\.|MCPToolRegistry|\.initialize\(\)/],
];

/** Areas the fast tier deliberately excludes, even when the suite is otherwise pure. */
export const EXCLUDED_AREAS = [
  ['workflow-engine', /lab-workflow|validate-lab-workflow/],
  ['mcp-tools', /\/mcp\//],
  ['ui-automation', /ui-automation/],
];

const CI_DIR = 'src/tests/ci/';
const REG_DIR = 'src/tests/regression/';

/**
 * Decide the tier for one suite.
 * @param {string} rel repo-relative path, forward slashes
 * @param {string} source file contents
 * @returns {{rel: string, tier: 'ci'|'regression', reason: string}}
 */
export function classify(rel, source) {
  const impure = IMPURE_MARKERS.find(([, re]) => re.test(source));
  if (impure) return { rel, tier: 'regression', reason: impure[0] };

  const excluded = EXCLUDED_AREAS.find(([, re]) => re.test(rel));
  if (excluded) return { rel, tier: 'regression', reason: `area:${excluded[0]}` };

  return { rel, tier: 'ci', reason: 'pure core' };
}

/** Target path for a suite, preserving the subpath beneath `src/tests/`. */
export function targetPath(rel, tier) {
  const sub = rel.replace(/^src\/tests\//, '');
  return path.posix.join('src/tests', tier, sub);
}

/** Every suite Jest resolves, from `jest --listTests` (does not execute anything). */
export function listJestSuites(repoRoot) {
  const out = execFileSync(
    process.execPath,
    [
      '--experimental-vm-modules',
      path.join(repoRoot, 'node_modules', 'jest', 'bin', 'jest.js'),
      '--listTests',
    ],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((abs) => path.relative(repoRoot, abs).replace(/\\/g, '/'));
}

/** Classify every suite currently resolved by Jest. */
export function classifyAll(repoRoot) {
  return listJestSuites(repoRoot).map((rel) => {
    const abs = path.join(repoRoot, rel);
    const source = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    return classify(rel, source);
  });
}

export { CI_DIR, REG_DIR };
