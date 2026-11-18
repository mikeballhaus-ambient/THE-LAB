/**
 * Jest global teardown — remove the per-worker SQLite files created by
 * [`jest.sqlite.setup.ts`](src/tests/jest.sqlite.setup.ts).
 *
 * Without this, every run left one `.db` + `.db-shm` + `.db-wal` trio per worker id behind in `db/`
 * (and, via the smoke suite, `db/the_lab_smoke.db*`). They are dead weight that only grows, they make
 * `git status` noisy because `.gitignore` covered `db/*.db` but not the `-shm`/`-wal` siblings, and a
 * stale `-wal` can be replayed into the next run's database.
 *
 * Deleting the whole directory is safe and is the point of putting the files in `db/jest/`: no glob has
 * to stay in sync with the naming scheme, and no stray file outside it is touched.
 *
 * ## Why `.cjs` with dynamic `import()`
 *
 * Jest loads this file as CommonJS, so `module.exports` is the only export form it accepts. The repo's
 * ESLint config forbids `require()` (`@typescript-eslint/no-require-imports`) — the whole repo is ESM
 * and a `require()` here would be the only one. `await import()` is the ESM-native equivalent, works
 * from CJS, and keeps this file lint-clean under the full-repo `npm run lint` that CI runs.
 *
 * ## Why the env var is dropped here
 *
 * Jest's global teardown runs in the parent process, which has already executed `setupFiles` (Jest
 * inherits the parent env). `setupFiles` sets `JEST_DB_DIR` so child processes can derive the path, but
 * any Jest instance spawned from this repo — `scripts/run-test-by-name.js`,
 * `scripts/run-test-by-path.js`, or a test that shells out — would then inherit a path whose directory
 * this teardown is about to delete. Clearing it keeps a nested run from pointing at its parent's
 * already-removed files.
 */
module.exports = async function globalTeardown() {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const dir = process.env.JEST_DB_DIR || path.join(process.cwd(), 'db', 'jest');
  const resolved = path.resolve(dir);
  const repoDbDir = path.resolve(process.cwd(), 'db');

  // Refuse to delete anything that is not a directory inside this repo's `db/`. A mis-set env var in CI
  // must not be able to remove something arbitrary.
  const isSafeTarget =
    resolved.startsWith(repoDbDir + path.sep) && path.basename(resolved) === 'jest';

  if (isSafeTarget) {
    try {
      fs.rmSync(resolved, { recursive: true, force: true });
    } catch {
      // Best-effort: a locked file (Windows) must never fail an otherwise green run.
    }
  } else {
    console.warn(`[jest] refused to clean unexpected DB path: ${resolved}`);
  }

  delete process.env.JEST_DB_DIR;
};
