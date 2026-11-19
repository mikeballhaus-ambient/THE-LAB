import { exec, spawnSync } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Ports that must never be killed by app-server tooling (main THE-LAB backend). */
export const PROTECTED_APP_SERVER_PORTS = new Set([3000]);

export type PortUtilLog = (level: 'info' | 'warn' | 'error', message: string) => void;

export function isProtectedAppServerPort(port: number): boolean {
  return PROTECTED_APP_SERVER_PORTS.has(port);
}

/**
 * PIDs listening on a TCP port (LISTEN only; avoids matching :30111 when targeting 3011).
 */
export async function getListeningPidsOnPort(
  port: number,
  log?: PortUtilLog,
  options?: { allowProtected?: boolean },
): Promise<number[]> {
  if (!options?.allowProtected && isProtectedAppServerPort(port)) {
    return [];
  }

  const platform = os.platform();
  const pids = new Set<number>();
  const portToken = new RegExp(`:${port}\\s`);

  try {
    if (platform === 'win32') {
      const { stdout } = await execAsync(`netstat -ano | findstr LISTENING | findstr :${port}`);
      for (const line of stdout.trim().split('\n')) {
        if (!line.trim() || !portToken.test(line)) {
          continue;
        }
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (!Number.isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    } else {
      const { stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null || true`);
      for (const line of stdout.trim().split('\n')) {
        const pid = Number(line.trim());
        if (!Number.isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string | number };
    if (platform === 'win32' && (err.code === 1 || err.code === '1')) {
      return [];
    }
    if (platform !== 'win32' && err.code === 1) {
      return [];
    }
    log?.('warn', `getListeningPidsOnPort port=${port}: ${err.message ?? error}`);
  }

  return [...pids];
}

export async function isAppServerPortInUse(port: number): Promise<boolean> {
  const pids = await getListeningPidsOnPort(port);
  return pids.length > 0;
}

/** Best-effort — Windows can hide elevated/other-session PIDs from tasklist. */
export function isWindowsProcessRunning(pid: number): boolean {
  if (os.platform() !== 'win32' || pid <= 0) {
    return false;
  }
  const result = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (/no tasks are running/i.test(out) || /requested object does not exist/i.test(out)) {
    return false;
  }
  return out.includes(String(pid));
}

/**
 * When netstat PIDs are stale or taskkill cannot see the owner, match node.exe by CLI (Vite, backend, Chroma).
 */
export async function killWindowsNodeByCommandLineHints(
  hints: string[],
  log?: PortUtilLog,
): Promise<number> {
  if (os.platform() !== 'win32' || hints.length === 0) {
    return 0;
  }
  const needlesLiteral = hints.map((h) => `'${h.replace(/'/g, "''")}'`).join(',');
  const script = `
$needles = @(${needlesLiteral})
$killed = 0
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  $cmd = $_.CommandLine
  if (-not $cmd) { return }
  foreach ($n in $needles) {
    if ($cmd -notlike ('*' + $n + '*')) { return }
  }
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  $killed++
}
Write-Output $killed
`.trim();

  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const killed = Number.parseInt((result.stdout ?? '').trim(), 10);
  const count = Number.isFinite(killed) ? killed : 0;
  if (result.stderr?.trim()) {
    log?.('warn', `killWindowsNodeByCommandLineHints: ${result.stderr.trim()}`);
  }
  if (count > 0) {
    log?.('info', `killWindowsNodeByCommandLineHints — stopped ${count} node process(es)`);
  }
  return count;
}

const LAB_DEV_PORT_NODE_HINTS: Record<number, string[]> = {
  5173: ['vite.js'],
  3000: ['backend-entry'],
};

const LAB_DEV_PORT_IMAGE_HINTS: Record<number, { images: string[]; cmdHints: string[] }> = {
  8000: { images: ['chroma.exe', 'python.exe'], cmdHints: ['chroma', '8000'] },
};

/** Stop whatever owns the TCP listener (Windows). */
export async function killWindowsListenersByNetTcpPort(port: number, log?: PortUtilLog): Promise<number> {
  if (os.platform() !== 'win32') {
    return 0;
  }
  const script = `
$killed = 0
$conns = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
  $owningPid = $c.OwningProcess
  if ($owningPid -gt 0) {
    Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
    $killed++
  }
}
Write-Output $killed
`.trim();
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const killed = Number.parseInt((result.stdout ?? '').trim(), 10);
  const count = Number.isFinite(killed) ? killed : 0;
  if (result.stderr?.trim()) {
    log?.('warn', `killWindowsListenersByNetTcpPort port=${port}: ${result.stderr.trim()}`);
  }
  if (count > 0) {
    log?.('info', `killWindowsListenersByNetTcpPort port=${port} — stopped ${count} process(es)`);
  }
  return count;
}

export async function killWindowsProcessesByImageHints(
  imageNames: string[],
  cmdHints: string[],
  log?: PortUtilLog,
): Promise<number> {
  if (os.platform() !== 'win32' || imageNames.length === 0 || cmdHints.length === 0) {
    return 0;
  }
  const images = imageNames.map((n) => `'${n.replace(/'/g, "''")}'`).join(',');
  const needles = cmdHints.map((h) => `'${h.replace(/'/g, "''")}'`).join(',');
  const script = `
$images = @(${images})
$needles = @(${needles})
$killed = 0
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  if ($images -notcontains $_.Name) { return }
  $cmd = $_.CommandLine
  if (-not $cmd) { return }
  foreach ($n in $needles) {
    if ($cmd -notlike ('*' + $n + '*')) { return }
  }
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  $killed++
}
Write-Output $killed
`.trim();
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const killed = Number.parseInt((result.stdout ?? '').trim(), 10);
  const count = Number.isFinite(killed) ? killed : 0;
  if (count > 0) {
    log?.('info', `killWindowsProcessesByImageHints — stopped ${count} process(es)`);
  }
  return count;
}

function isProcessAlreadyGone(
  platform: string,
  err: Error & { code?: string | number },
  msg: string,
): boolean {
  if (err.code === 'ESRCH') {
    return true;
  }
  if (platform !== 'win32') {
    return false;
  }
  const lower = msg.toLowerCase();
  return (
    lower.includes('not found') ||
    lower.includes('no tasks') ||
    lower.includes('does not exist') ||
    lower.includes('there is no running instance')
  );
}

/**
 * Kill process (Windows: full tree via taskkill — needed for npx/tsx app servers).
 */
export async function killProcessTree(pid: number, log?: PortUtilLog): Promise<boolean> {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      await execAsync(`taskkill /PID ${pid} /T /F`);
      return true;
    }

    process.kill(pid, 'SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      process.kill(pid, 0);
      log?.('info', `killProcessTree — SIGKILL pid=${pid}`);
      process.kill(pid, 'SIGKILL');
    } catch {
      return true;
    }
    return true;
  } catch (error: unknown) {
    const err = error as Error & { code?: string | number };
    const msg = err.message ?? String(error);
    if (isProcessAlreadyGone(platform, err, msg)) {
      log?.('info', `killProcessTree pid=${pid}: already stopped`);
      return true;
    }
    log?.('error', `killProcessTree pid=${pid}: ${msg}`);
    return false;
  }
}

/**
 * Stop listeners on a lab dev port; retries until the port is free or attempts are exhausted.
 */
export async function killLabDevPortListeners(
  port: number,
  log?: PortUtilLog,
  options?: { allowProtected?: boolean },
): Promise<boolean> {
  const maxRounds = 4;
  for (let round = 0; round < maxRounds; round++) {
    const pids = await getListeningPidsOnPort(port, log, options);
    if (pids.length === 0) {
      return true;
    }

    for (const pid of pids) {
      log?.('info', `Stopping listener on port ${port} (pid ${pid})…`);
      if (isWindowsProcessRunning(pid)) {
        await killProcessTree(pid, log);
      } else if (os.platform() === 'win32') {
        log?.(
          'warn',
          `Port ${port} reports pid ${pid} but tasklist cannot see it — using node command-line fallback`,
        );
      }
    }

    const hints = LAB_DEV_PORT_NODE_HINTS[port];
    if (hints) {
      await killWindowsNodeByCommandLineHints(hints, log);
    }
    const imageHints = LAB_DEV_PORT_IMAGE_HINTS[port];
    if (imageHints) {
      await killWindowsProcessesByImageHints(imageHints.images, imageHints.cmdHints, log);
    }
    if (os.platform() === 'win32') {
      await killWindowsListenersByNetTcpPort(port, log);
    }

    if (await waitUntilAppServerPortFree(port, 2500)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const remaining = await getListeningPidsOnPort(port, log, options);
  if (remaining.length > 0) {
    log?.(
      'warn',
      `Port ${port} still in use (pids: ${remaining.join(', ')}). Close the terminal running Vite/backend, or run stop from an elevated shell.`,
    );
    return false;
  }
  return true;
}

export async function killListenersOnPort(
  port: number,
  log?: PortUtilLog
): Promise<{ pids: number[]; killedAny: boolean }> {
  if (isProtectedAppServerPort(port)) {
    log?.('error', `killListenersOnPort — blocked protected port ${port}`);
    return { pids: [], killedAny: false };
  }

  const pids = await getListeningPidsOnPort(port, log);
  if (pids.length === 0) {
    log?.('info', `killListenersOnPort — no listeners on port ${port}`);
    return { pids: [], killedAny: false };
  }

  let killedAny = false;
  for (const pid of pids) {
    log?.('info', `killListenersOnPort — stopping pid=${pid} port=${port}`);
    if (await killProcessTree(pid, log)) {
      killedAny = true;
    }
  }

  return { pids, killedAny };
}

export async function waitUntilAppServerPortFree(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isAppServerPortInUse(port))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}
