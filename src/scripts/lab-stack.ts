#!/usr/bin/env node

/**
 * THE-LAB local stack orchestrator (start/stop).
 * See plans/the-lab-optimization/lab-stack-lifecycle.md and docs/operations/lab-stack.md
 */

import 'dotenv/config';
import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getListeningPidsOnPort,
  killLabDevPortListeners,
  killProcessTree,
} from '../backend/utils/app-server-port-utils';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stateDir = path.join(repoRoot, '.lab-stack');
const stateFile = path.join(stateDir, 'state.json');

const BACKEND_URL = 'http://127.0.0.1:3000';
const VITE_URL = 'http://127.0.0.1:5173/';
const CHROMA_HEARTBEAT = 'http://127.0.0.1:8000/api/v2/heartbeat';
interface LabStackState {
  pids: {
    chroma?: number;
    backend?: number;
    vite?: number;
  };
  servicesOnly: boolean;
  startedAt: string;
}

function log(level: 'info' | 'warn' | 'error', message: string): void {
  const prefix = '[lab-stack]';
  const line = `${prefix} ${message}`;
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function parseStartArgs(argv: string[]): {
  servicesOnly: boolean;
  detach: boolean;
  waitReady: boolean;
} {
  return {
    servicesOnly: argv.includes('--services-only'),
    detach: argv.includes('--detach'),
    waitReady: argv.includes('--wait-ready'),
  };
}

function readState(): LabStackState | undefined {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return JSON.parse(raw) as LabStackState;
  } catch {
    return undefined;
  }
}

function writeState(state: LabStackState): void {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function clearState(): void {
  try {
    fs.unlinkSync(stateFile);
  } catch {
    // ignore
  }
}

function runNpmScript(script: string, extraArgs: string[] = []): number {
  const result = spawnSync('npm', ['run', script, ...extraArgs], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
    env: process.env,
  });
  return result.status ?? 1;
}

function repoNodeModule(rel: string): string {
  return path.join(repoRoot, 'node_modules', rel);
}

/** Detached lab services — no visible console on Windows (no `shell: true`). */
function spawnLabService(
  executable: string,
  args: string[],
  detach: boolean,
  options?: { env?: NodeJS.ProcessEnv; logFd?: number },
): ChildProcess {
  const stdio: SpawnOptions['stdio'] =
    detach && options?.logFd !== undefined
      ? ['ignore', options.logFd, options.logFd]
      : detach
        ? 'ignore'
        : 'inherit';

  const child = spawn(executable, args, {
    cwd: repoRoot,
    env: options?.env ?? process.env,
    detached: detach,
    windowsHide: true,
    stdio,
  });
  if (detach && child.pid) {
    child.unref();
  }
  return child;
}

function spawnChromaProcess(detach: boolean): number | undefined {
  const bin = resolveChromaBin();
  const child = spawnLabService(
    bin,
    ['run', '--host', '127.0.0.1', '--port', '8000', '--path', './chroma-data'],
    detach,
  );
  return child.pid;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url: string, label: string, timeoutMs = 120_000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) {
        log('info', `${label} ready (${url})`);
        return true;
      }
    } catch {
      // retry
    }
    await sleep(500);
  }
  log('warn', `${label} not ready within ${timeoutMs}ms (${url})`);
  return false;
}

/** npm `chromadb` CLI is ARM64-only on Windows; prefer Python `chroma.exe`. */
function resolveChromaBin(): string {
  const fromEnv = process.env.THE_LAB_CHROMA_BIN?.trim();
  if (fromEnv) {
    if (fs.existsSync(fromEnv)) {
      return fromEnv;
    }
    log(
      'warn',
      `THE_LAB_CHROMA_BIN is set but not found (${fromEnv}); falling back to auto-detect.`,
    );
  }

  if (process.platform !== 'win32') {
    const home = process.env.HOME ?? '';
    if (home) {
      const userLocalChroma = path.join(home, '.local', 'bin', 'chroma');
      if (fs.existsSync(userLocalChroma)) {
        return userLocalChroma;
      }
    }
    return 'chroma';
  }

  if (process.platform === 'win32') {
    const where = spawnSync('where.exe', ['chroma'], {
      encoding: 'utf8',
      shell: true,
    });
    const candidates = (where.stdout ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.replace(/\\/g, '/').toLowerCase().includes('node_modules'));

    if (candidates.length > 0) {
      return candidates[0];
    }

    const localAppData = process.env.LOCALAPPDATA ?? '';
    for (const version of ['Python312', 'Python311', 'Python313', 'Python310']) {
      const fallback = path.join(localAppData, 'Programs', 'Python', version, 'Scripts', 'chroma.exe');
      if (fs.existsSync(fallback)) {
        return fallback;
      }
    }
  }

  return 'chroma';
}

function assertChromaBinUsable(bin: string): boolean {
  const normalized = bin.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('node_modules/chromadb')) {
    log(
      'error',
      'Chroma would run via npm chromadb (unsupported on Windows x64). Set THE_LAB_CHROMA_BIN in .env to your Python chroma.exe path.',
    );
    return false;
  }
  if (process.platform === 'win32' && bin === 'chroma') {
    log(
      'error',
      'No usable chroma.exe found on PATH. Install Chroma via pip or set THE_LAB_CHROMA_BIN in .env (see .env.example).',
    );
    return false;
  }
  return true;
}

async function waitForChromaReady(timeoutMs = 120_000): Promise<boolean> {
  return waitForHttp(CHROMA_HEARTBEAT, 'Chroma', timeoutMs);
}

function spawnBackend(detach: boolean): number | undefined {
  const tsxCli = repoNodeModule('tsx/dist/cli.mjs');
  const child = spawnLabService(process.execPath, [tsxCli, 'src/backend-entry.ts'], detach, {
    env: { ...process.env, APP_SERVER_ALLOW_KILL: '1' },
  });
  return child.pid;
}

function spawnVite(detach: boolean): number | undefined {
  const viteCli = repoNodeModule('vite/bin/vite.js');
  const viteArgs = ['--host', '127.0.0.1', '--port', '5173', '--strictPort'];
  if (detach) {
    fs.mkdirSync(stateDir, { recursive: true });
    const logPath = path.join(stateDir, 'vite.log');
    const logFd = fs.openSync(logPath, 'a');
    fs.appendFileSync(logPath, `\n--- vite start ${new Date().toISOString()} ---\n`);
    const child = spawnLabService(process.execPath, [viteCli, ...viteArgs], true, { logFd });
    return child.pid;
  }
  const child = spawnLabService(process.execPath, [viteCli, ...viteArgs], false);
  return child.pid;
}

async function killTrackedPids(state: LabStackState | undefined): Promise<void> {
  const pids = state?.pids ?? {};
  for (const [name, pid] of Object.entries(pids)) {
    if (pid == null || pid <= 0) {
      continue;
    }
    log('info', `Stopping ${name} (pid ${pid})…`);
    await killProcessTree(pid, (level, msg) => log(level, msg));
  }
}

async function killLabDevPort(port: number): Promise<void> {
  await killLabDevPortListeners(port, (level, msg) => log(level, msg), { allowProtected: true });
}

async function stopLabDevPorts(): Promise<void> {
  for (const port of [5173, 3000, 8000]) {
    await killLabDevPort(port);
  }
}

async function stopStack(): Promise<number> {
  const state = readState();
  await killTrackedPids(state);
  await stopLabDevPorts();

  log('info', 'Stopping app servers…');
  runNpmScript('kill:app-servers');

  clearState();
  log('info', 'Lab stack stop complete.');
  return 0;
}

async function startStack(argv: string[]): Promise<number> {
  const opts = parseStartArgs(argv);

  log('info', 'Syncing app directories…');
  const syncCode = runNpmScript('pre-bootstrap');
  if (syncCode !== 0) {
    return syncCode;
  }

  const state: LabStackState = {
    pids: {},
    servicesOnly: opts.servicesOnly,
    startedAt: new Date().toISOString(),
  };

  log('info', 'Starting Chroma…');
  const chromaAlreadyRunning = await waitForChromaReady(3_000);
  let chromaReady = chromaAlreadyRunning;

  if (chromaAlreadyRunning) {
    log('info', 'Chroma already running on 127.0.0.1:8000 — reusing it (skip second spawn).');
  } else {
    const busy8000 = await getListeningPidsOnPort(8000, (level, msg) => log(level, msg), {
      allowProtected: true,
    });
    if (busy8000.length > 0) {
      log(
        'warn',
        'Port 8000 is in use but Chroma heartbeat failed — stopping listener and respawning Chroma…',
      );
      await killLabDevPort(8000);
      await sleep(500);
    }

    const chromaBin = resolveChromaBin();
    if (!assertChromaBinUsable(chromaBin)) {
      return 1;
    }
    if (chromaBin !== 'chroma') {
      log('info', `Using Chroma: ${chromaBin}`);
    }
    state.pids.chroma = spawnChromaProcess(opts.detach);

    chromaReady = await waitForChromaReady();
  }

  if (!chromaReady) {
    log(
      'error',
      'Chroma did not respond. On Windows x64 use Python Chroma (not npm): set THE_LAB_CHROMA_BIN to your chroma.exe path, then retry.',
    );
    await stopStack();
    return 1;
  }

  if (!opts.servicesOnly) {
    const busy3000 = await getListeningPidsOnPort(3000, (level, msg) => log(level, msg), {
      allowProtected: true,
    });
    if (busy3000.length > 0) {
      log('warn', 'Port 3000 already in use — stopping existing process (orphan backend?)…');
      await killLabDevPort(3000);
      await sleep(500);
    }
    const busy5173 = await getListeningPidsOnPort(5173, (level, msg) => log(level, msg), {
      allowProtected: true,
    });
    if (busy5173.length > 0) {
      log('warn', 'Port 5173 already in use — stopping existing process (orphan Vite?)…');
      await killLabDevPort(5173);
      await sleep(500);
    }
    log('info', 'Starting backend…');
    state.pids.backend = spawnBackend(opts.detach);
    log('info', 'Starting Vite…');
    state.pids.vite = spawnVite(opts.detach);
  }

  writeState(state);

  if (opts.waitReady) {
    await sleep(1500);
    if (!opts.servicesOnly) {
      const backendReady = await waitForHttp(BACKEND_URL, 'Backend');
      const viteReady = await waitForHttp(VITE_URL, 'Vite', 180_000);
      if (!backendReady || !viteReady) {
        log(
          'error',
          `Stack not ready (backend=${backendReady}, vite=${viteReady}). Detached Vite logs: ${path.join(stateDir, 'vite.log')}`,
        );
        await stopStack();
        return 1;
      }
    }
  }

  if (opts.detach) {
    log('info', 'Stack started (detach). Run npm run lab:stop to tear down.');
    return 0;
  }

  if (opts.servicesOnly) {
    log('info', 'Services-only mode — attach debugger to Backend/Vite, then npm run lab:stop.');
    return 0;
  }

  log('info', 'Full stack running. Press Ctrl+C to stop.');
  const onStop = async (): Promise<void> => {
    await stopStack();
    process.exit(0);
  };
  process.on('SIGINT', () => {
    void onStop();
  });
  process.on('SIGTERM', () => {
    void onStop();
  });

  await new Promise<void>(() => {
    // keep foreground until signal
  });
  return 0;
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'stop') {
    return stopStack();
  }
  if (command === 'start' || command === undefined) {
    const args = command === 'start' ? rest : process.argv.slice(2);
    return startStack(args);
  }
  log('error', `Unknown command "${command}". Use: start | stop`);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    log('error', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
