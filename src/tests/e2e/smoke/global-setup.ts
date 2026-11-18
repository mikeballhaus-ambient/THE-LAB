import { execSync, type ExecSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

function removeSmokeDbFiles(): void {
  const smokeDb = path.join(repoRoot, 'db', 'the_lab_smoke.db');
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(`${smokeDb}${suffix}`);
    } catch {
      // missing is fine
    }
  }
}

export default async function globalSetup(): Promise<void> {
  if (process.env.SMOKE_SKIP_LAB_STACK === '1') {
    return;
  }

  removeSmokeDbFiles();

  const labStartOpts: ExecSyncOptions = {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    env: {
      ...process.env,
      DATABASE_PATH: 'db/the_lab_smoke.db',
      REQUIRE_ADMIN_PASSWORD_RESET: '0',
      LAB_APP_SERVER_WARMUP: '0',
    },
  };
  execSync('npm run lab:start -- --wait-ready --detach', labStartOpts);
}
