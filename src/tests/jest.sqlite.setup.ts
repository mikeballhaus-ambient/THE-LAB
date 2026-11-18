import fs from 'node:fs';
import path from 'node:path';

/**
 * Isolated SQLite for Jest — never touch dev `db/the_lab.db`.
 *
 * ## One file per worker
 *
 * Parallel workers otherwise contend on a single file and hit `SQLITE_BUSY` timeouts, so each worker
 * gets its own database. It lives under `db/jest/` so cleanup is one directory removal rather than a
 * glob that has to stay in sync with the naming scheme.
 *
 * ## Cleaned before and after
 *
 * `setupFiles` runs once per test file, so anything left by a crashed run is cleared here, and
 * [`jest.global-teardown.cjs`](../../jest.global-teardown.cjs) removes the directory when the run ends.
 * Before that teardown existed these files accumulated forever — one `.db` + `.db-shm` + `.db-wal` trio
 * per worker id, per run, in the repo root's `db/` folder.
 */
const JEST_DB_DIR = path.join(process.cwd(), 'db', 'jest');
process.env.JEST_DB_DIR = JEST_DB_DIR;

const workerId = process.env.JEST_WORKER_ID ?? '1';
process.env.DATABASE_PATH = path.join(JEST_DB_DIR, `worker-${workerId}.db`);

/**
 * Remove this worker's leftovers. `-shm`/`-wal` matter as much as the `.db`: truncating only the main
 * file leaves a stale write-ahead log that SQLite will replay into the fresh database.
 */
function clearWorkerDb(dbPath: string): void {
  for (const suffix of ['', '-shm', '-wal', '-journal']) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

try {
  fs.mkdirSync(JEST_DB_DIR, { recursive: true });
  clearWorkerDb(process.env.DATABASE_PATH);
} catch {
  // A read-only or missing `db/` must not fail the suite — `databaseManager` will report the real
  // problem when it tries to open the path.
}
