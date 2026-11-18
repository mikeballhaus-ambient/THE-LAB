/**
 * Report the tier split without changing anything.
 *
 *   node scripts/report-test-tiers.mjs
 *
 * Read-only: prints counts, the reason each regression suite was excluded, and the full CI list.
 * Useful before and after the migration.
 */

import { classifyAll } from './lib/test-tiers.mjs';

const REPO = process.cwd();
const all = classifyAll(REPO);
const ci = all.filter((s) => s.tier === 'ci');
const regression = all.filter((s) => s.tier === 'regression');

const reasons = {};
for (const s of regression) reasons[s.reason] = (reasons[s.reason] || 0) + 1;

console.log(`suites: ${all.length}`);
console.log(`  ci:         ${ci.length}  (${((ci.length / all.length) * 100).toFixed(0)}%)`);
console.log(`  regression: ${regression.length}`);
console.log('\nregression exclusion reasons:');
for (const [reason, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${reason}`);
}

const byDir = (list, dir) => list.filter((s) => s.rel.startsWith(dir)).length;
console.log('\nci tier by directory:');
for (const dir of ['src/tests/backend/', 'src/tests/shared/', 'src/tests/scripts/', 'src/tests/apps/']) {
  console.log(`  ${String(byDir(ci, dir)).padStart(3)}  ${dir}`);
}

if (process.argv.includes('--list')) {
  console.log('\n--- ci tier');
  for (const s of ci.sort((a, b) => a.rel.localeCompare(b.rel))) console.log(s.rel);
}

console.log(
  `\n${ci.length} of ${all.length} suites (${((ci.length / all.length) * 100).toFixed(0)}%) would run in the Azure gate.`,
);
console.log(`Files in this script's own directory are excluded automatically (none are .test.ts).`);
