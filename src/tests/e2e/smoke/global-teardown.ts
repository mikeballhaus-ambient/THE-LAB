import { execSync, type ExecSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

/**
 * Delete the smoke database trio.
 *
 * `global-setup` already removes it *before* the run, which is why a smoke database has to be cleaned
 * twice: cleaning only up front leaves the last run's files behind in `db/` until the next smoke run
 * (potentially never). This is the same class of leak as the per-worker Jest databases — create, never
 * remove — so it is fixed here rather than tolerated.
 */
function removeSmokeDbFiles(): void {
  const smokeDb = path.join(repoRoot, 'db', 'the_lab_smoke.db');
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try {
      fs.rmSync(`${smokeDb}${suffix}`, { force: true });
    } catch {
      // A locked file must never fail an otherwise passing run.
    }
  }
}

export default async function globalTeardown(): Promise<void> {
  if (process.env.SMOKE_SKIP_LAB_STACK === '1') {
    // The stack was not started by this run, so it does not own the files either — but the database
    // still belongs to a smoke run, so remove it and leave the stack alone.
    removeSmokeDbFiles();
    return;
  }

  const labStopOpts: ExecSyncOptions = {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    env: process.env,
  };
  execSync('npm run lab:stop', labStopOpts);
  removeSmokeDbFiles();
}
