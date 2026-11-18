import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const smokeDb = path.join(repoRoot, 'db', 'the_lab_smoke.db');

function removeSmokeDbFiles() {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(`${smokeDb}${suffix}`);
    } catch {
      // ignore
    }
  }
}

function run(command, args, env, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
    env,
  });
  const code = result.status ?? 1;
  if (code !== 0 && !allowFailure) {
    process.exit(code);
  }
  return code;
}

function stopLabStack() {
  console.log('\n[test:smoke] Stopping lab stack…\n');
  run('npm', ['run', 'lab:stop'], process.env, { allowFailure: true });
}

const baseEnv = {
  ...process.env,
  DATABASE_PATH: smokeDb,
  REQUIRE_ADMIN_PASSWORD_RESET: '0',
  LAB_APP_SERVER_WARMUP: '0',
};

let stopping = false;
function handleInterrupt() {
  if (stopping) {
    return;
  }
  stopping = true;
  stopLabStack();
  process.exit(130);
}

process.on('SIGINT', handleInterrupt);
process.on('SIGTERM', handleInterrupt);

removeSmokeDbFiles();

try {
  run('npm', ['run', 'lab:start', '--', '--wait-ready', '--detach'], baseEnv);
  console.log('\n[test:smoke] Lab stack ready — running Playwright (project: smoke)…\n');
  run(
    'npx',
    ['playwright', 'test', '--project=smoke'],
    { ...baseEnv, SMOKE_SKIP_LAB_STACK: '1' },
  );
} finally {
  if (!stopping) {
    stopping = true;
    stopLabStack();
  }
}
