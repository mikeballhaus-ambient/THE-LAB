/**
 * The fast gate (`npm run test:ci`, `src/tests/ci/**`) runs ~127 pure suites and needs a different
 * worker-memory ceiling from the full regression (~290 suites, including DB-backed ones). Rather
 * than add a dependency to set an env var, detect the tier from the arguments Jest was invoked with.
 */
function isCiTierRun() {
  return process.argv.some((arg) => arg.includes('/src/tests/ci/'));
}

/** @type {import('jest').Config} */
module.exports = {
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        diagnostics: false
      }
    ]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/shared/services/app-component-glob$':
      '<rootDir>/src/tests/mocks/app-component-glob.mock.ts',
    '^\\.\\./app-component-glob$': '<rootDir>/src/tests/mocks/app-component-glob.mock.ts',
    '^\\./app-component-glob$': '<rootDir>/src/tests/mocks/app-component-glob.mock.ts',
  },
  testEnvironment: 'node',
  testTimeout: 30_000,
  // Recycle a worker once it is holding more than this after finishing a test file.
  //
  // Jest never releases an ESM module registry between test files, so a worker that runs many suites
  // accumulates their module graphs permanently. On a 2-vCPU agent Jest's default `maxWorkers` is 1,
  // which means **one** long-lived worker runs all ~289 suites: measured locally with `--logHeapUsage`
  // it climbs 603 MB → 1.4 GB → 2.5 GB → 3.2 GB and dies at the default 2 GB ceiling with
  // `Ineffective mark-compacts near heap limit`. It is not a leak in any one suite — it is 289 suites
  // in one process.
  //
  // Recycling costs a module reload per restart and bounds the peak to roughly one suite's footprint.
  // This is the fix rather than raising the heap limit, because a larger limit only buys more suites
  // before the same wall.
  //
  // CALIBRATION (2026-10-22), measured with `--logHeapUsage` on the `ci` tier (127 pure suites):
  //   - Accumulation is ~5 MB per suite; a single worker over all 127 climbs 577 MB -> 1210 MB.
  //   - The baseline after one suite is already ~531 MB, so 512 MB sits below the floor.
  //
  // On this 16-core dev box the default parallel run stays flat at 539-608 MB (many short-lived
  // workers), so the ceiling rarely fires. On a 2-vCPU agent `maxWorkers` is 1, and there the
  // trajectory is 578 -> 934 -> 1156 MB for the full ci tier — still far below the 2 GB heap
  // default, but not far below what a handful of heavier suites could reach.
  //
  // The ci run therefore raises the ceiling to 1536 MB: it only recycles if a worker is genuinely
  // large, instead of after every suite. The full regression keeps 512 MB because 290 suites,
  // including the DB-backed and MCP-booting ones, do approach the heap default. Increase it there
  // only with a `--logHeapUsage` measurement in hand.
  workerIdleMemoryLimit: isCiTierRun() ? '1536MB' : '512MB',
  setupFiles: ['<rootDir>/src/tests/jest.sqlite.setup.ts'],
  // Removes `db/jest/` when the run ends. Without a teardown the per-worker SQLite trio was never
  // deleted and accumulated one file set per worker id, per run.
  globalTeardown: '<rootDir>/jest.global-teardown.cjs',
  testMatch: [
    '<rootDir>/src/tests/**/*.test.(ts|tsx)',
    '<rootDir>/src/scripts/**/*.test.(ts|tsx)',
    '<rootDir>/src/apps/forms-builder/**/tests/**/*.test.ts',
    '<rootDir>/src/apps/forms-builder/**/tests/**/*.spec.ts',
  ],
  // Playwright E2E lives under tests/e2e — run via `npx playwright test` (D-07), not Jest
  testPathIgnorePatterns: ['<rootDir>/src/apps/forms-builder/front-end/tests/e2e'],
};