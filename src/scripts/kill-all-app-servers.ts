#!/usr/bin/env node

/**
 * Stops all THE-LAB server/hybrid app processes using ports from the apps registry (SQLite).
 * Does NOT stop main backend (:3000) or Vite (:5173).
 *
 * Usage:
 *   npm run kill:app-servers
 *   npx tsx src/scripts/kill-all-app-servers.ts
 *   npx tsx src/scripts/kill-all-app-servers.ts --list
 */

import { exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';
import { databaseManager } from '../backend/db/DatabaseManager';
import { appsService } from '../backend/db/Apps/apps-service';
import {
  isProtectedAppServerPort,
  killListenersOnPort,
} from '../backend/utils/app-server-port-utils';
import type { IApp } from '../shared/types';

const execAsync = promisify(exec);

function log(level: 'info' | 'warn' | 'error', message: string): void {
  const prefix = '(kill:app-servers)';
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function registryAppServers(apps: IApp[]): IApp[] {
  return apps.filter(
    (a) =>
      (a.type === 'server' || a.type === 'hybrid') &&
      a.isServerSideEnabled &&
      a.server?.port != null,
  );
}

function uniquePorts(apps: IApp[]): number[] {
  const ports = new Set<number>();
  for (const app of apps) {
    const port = app.server?.port;
    if (port != null && !isProtectedAppServerPort(port)) {
      ports.add(port);
    }
  }
  return [...ports].sort((a, b) => a - b);
}

async function killOrphanAppServerNodeProcesses(): Promise<number> {
  if (os.platform() !== 'win32') {
    return 0;
  }

  const ps = `
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object { $_.CommandLine -match 'apps\\\\[^\\\\]+\\\\back-end\\\\(entry|server)\\.ts' } |
      ForEach-Object { $_.ProcessId }
  `;

  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "${ps.replace(/\r?\n/g, ' ')}"`,
    );
    let killed = 0;
    for (const line of stdout.trim().split(/\s+/)) {
      const pid = Number(line);
      if (Number.isNaN(pid) || pid <= 0) {
        continue;
      }
      try {
        await execAsync(`taskkill /PID ${pid} /T /F`);
        log('info', `Stopped orphan app server node PID ${pid} (command-line match)`);
        killed += 1;
      } catch {
        // already gone
      }
    }
    return killed;
  } catch {
    return 0;
  }
}

async function main(): Promise<number> {
  const listOnly = process.argv.includes('--list') || process.argv.includes('-l');

  await databaseManager.initialize();
  const apps = registryAppServers(appsService.getAllApps());
  const ports = uniquePorts(apps);

  if (listOnly) {
    if (apps.length === 0) {
      log('info', 'No server/hybrid apps with a registered port in the lab DB.');
      return 0;
    }
    log('info', 'App servers from db/the_lab.db (apps table):');
    for (const app of apps.sort((a, b) => (a.server?.port ?? 0) - (b.server?.port ?? 0))) {
      log('info', `  ${app.id}  ${app.name}  port ${app.server?.port}  (${app.type})`);
    }
    return 0;
  }

  if (ports.length === 0) {
    log('info', 'No app server ports in registry; checking orphan node processes only.');
  } else {
    log('info', `Stopping listeners on registry ports: ${ports.join(', ')}`);
    for (const port of ports) {
      await killListenersOnPort(port, (level, msg) => log(level, msg));
    }
  }

  const orphanKilled = await killOrphanAppServerNodeProcesses();
  log('info', `Done. Registry ports cleared; ${orphanKilled} orphan node process(es) stopped by command line.`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    log('error', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
