#!/usr/bin/env node

/**
 * Stops the registered app server for one THE-LAB app (by registry id or folder slug).
 * Used after hybrid/server back-end code changes so the next dashboard launch loads new code.
 *
 * Does NOT stop the main backend (3000) or Vite. Affects all users on that app port — use deliberately.
 *
 * Usage:
 *   npm run restart:app-server -- --list
 *   npm run restart:app-server -- app-lab-formsbuilder
 *   npm run restart:app-server -- forms-builder
 */

import { databaseManager } from '../backend/db/DatabaseManager';
import { appsService } from '../backend/db/Apps/apps-service';
import {
  killListenersOnPort,
  waitUntilAppServerPortFree,
} from '../backend/utils/app-server-port-utils';
import type { IApp } from '../shared/types';

function log(level: 'info' | 'warn' | 'error', message: string): void {
  const prefix = '[restart:app-server]';
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function normalizeRegistryAppId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith('app-') ? trimmed : `app-${trimmed}`;
}

function serverApps(apps: IApp[]): IApp[] {
  return apps.filter(
    (a) =>
      a.isServerSideEnabled &&
      a.server?.port != null &&
      (a.type === 'server' || a.type === 'hybrid')
  );
}

function printList(apps: IApp[]): void {
  const rows = serverApps(apps).sort((a, b) => (a.server?.port ?? 0) - (b.server?.port ?? 0));
  if (rows.length === 0) {
    log('info', 'No server or hybrid apps with a registered port.');
    return;
  }
  log('info', 'Restartable app servers (registry id → port):');
  for (const app of rows) {
    log('info', `  ${app.id}  ${app.name}  port ${app.server?.port}  (${app.type})`);
  }
  log('info', 'Run: npm run restart:app-server -- <registry-id-or-slug>');
}

async function resolveApp(appIdArg: string): Promise<IApp | undefined> {
  const candidates = [normalizeRegistryAppId(appIdArg), appIdArg.trim()];
  const unique = [...new Set(candidates.filter(Boolean))];
  for (const id of unique) {
    const app = appsService.getAppById(id);
    if (app) {
      return app;
    }
  }
  return undefined;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  await databaseManager.initialize();

  if (args.length === 0 || args.includes('--list') || args.includes('-l')) {
    printList(appsService.getAllApps());
    return 0;
  }

  const appIdArg = args.find((a) => !a.startsWith('-'));
  if (!appIdArg) {
    log('error', 'Provide an app id or use --list');
    return 1;
  }

  const app = await resolveApp(appIdArg);
  if (!app) {
    log('error', `App not found for "${appIdArg}". Try: npm run restart:app-server -- --list`);
    return 1;
  }

  if (!app.isServerSideEnabled || !app.server?.port) {
    log('error', `App "${app.id}" has no server side / port (type=${app.type}).`);
    return 1;
  }

  const port = app.server.port;
  log('info', `Stopping server for ${app.name} (${app.id}) on port ${port}…`);

  const { pids, killedAny } = await killListenersOnPort(port, (level, msg) => log(level, msg));
  if (pids.length === 0) {
    log('info', `Port ${port} was already free. Relaunch the app from THE-LAB to start fresh code.`);
    return 0;
  }

  const freed = await waitUntilAppServerPortFree(port, 8000);
  if (!freed) {
    log('warn', `Port ${port} may still be in use after kill (pids attempted: ${pids.join(', ')}).`);
    return 1;
  }

  if (killedAny) {
    log('info', `Port ${port} is free. Have the user relaunch "${app.name}" from the dashboard (or use UI automation Launch) to pick up back-end changes.`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    log('error', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
