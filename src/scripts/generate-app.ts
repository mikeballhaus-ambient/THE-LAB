#!/usr/bin/env node
/**
 * generate-app.ts - CLI script for generating new browser or server apps
 *
 * Interactive (human):
 *   npm run generate:app
 *
 * Non-interactive (agents / CI):
 *   npm run generate:app -- --name notification-hub --type hybrid \
 *     --description "In-app notifications" --port 3015 --order 9 --icon fa-bell
 *
 * Optional: --dependencies app-lab-formsbuilder,app-lab-tasklist
 */

import * as readline from 'readline';
import * as pathModule from 'path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { templateGenerator, capitalize } from '../shared/services/TemplateGenerator';
import { registerDefaultPlatformAppsCatalog } from '../backend/platform/register-platform-apps-catalog';
import { AppType } from '../shared/types';

export interface GenerateAppInput {
  appName: string;
  appType: AppType;
  appDescription: string;
  port: number;
  appOrder: number;
  appFaIcon: string;
  dependencies: string[];
}

const APP_TYPES: AppType[] = ['browser', 'server', 'hybrid'];

function printUsage(): void {
  console.log(`
=== The Lab App Generator ===

Interactive:
  npm run generate:app

Non-interactive (pass --name to enable; all fields below required except port/deps):
  npm run generate:app -- \\
    --name <slug> \\
    --type browser|server|hybrid \\
    --description "<text>" \\
    --order <number> \\
    --icon <fa-icon> \\
    [--port <number>] \\
    [--dependencies id1,id2]

Example:
  npm run generate:app -- --name notification-hub --type hybrid \\
    --description "Notification Hub" --port 3015 --order 9 --icon fa-bell
`);
}

function parseDependencies(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** Parse argv for non-interactive mode. Returns null when --name was not passed (use prompts). */
export function parseGenerateAppArgv(argv: string[]): GenerateAppInput | null | 'help' {
  const { values } = parseArgs({
    args: argv,
    options: {
      name: { type: 'string', short: 'n' },
      type: { type: 'string', short: 't' },
      description: { type: 'string', short: 'd' },
      port: { type: 'string', short: 'p' },
      order: { type: 'string', short: 'o' },
      icon: { type: 'string', short: 'i' },
      dependencies: { type: 'string' },
      deps: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    return 'help';
  }

  const nameRaw = values.name;
  if (nameRaw == null || String(nameRaw).trim() === '') {
    return null;
  }

  const appName = String(nameRaw).trim().toLowerCase();
  const appTypeRaw = values.type;
  if (appTypeRaw == null || String(appTypeRaw).trim() === '') {
    throw new Error('Non-interactive mode requires --type (browser|server|hybrid).');
  }
  const appType = String(appTypeRaw).trim().toLowerCase() as AppType;
  if (!APP_TYPES.includes(appType)) {
    throw new Error(`Invalid --type "${appTypeRaw}". Use browser, server, or hybrid.`);
  }

  const appDescription = values.description != null ? String(values.description).trim() : '';
  if (!appDescription) {
    throw new Error('Non-interactive mode requires --description.');
  }

  const orderRaw = values.order;
  if (orderRaw == null || String(orderRaw).trim() === '') {
    throw new Error('Non-interactive mode requires --order (display order number).');
  }
  const appOrder = Number.parseInt(String(orderRaw).trim(), 10);
  if (!Number.isFinite(appOrder)) {
    throw new Error(`Invalid --order "${orderRaw}".`);
  }

  const appFaIcon = values.icon != null ? String(values.icon).trim() : '';
  if (!appFaIcon) {
    throw new Error('Non-interactive mode requires --icon (e.g. fa-bell).');
  }

  let port = 4000;
  if (appType === 'server' || appType === 'hybrid') {
    if (values.port != null && String(values.port).trim() !== '') {
      port = Number.parseInt(String(values.port).trim(), 10) || 4000;
    }
  }

  const depsRaw = values.dependencies ?? values.deps;
  const dependencies = parseDependencies(depsRaw != null ? String(depsRaw) : undefined);

  return {
    appName,
    appType,
    appDescription,
    port,
    appOrder,
    appFaIcon,
    dependencies,
  };
}

function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function promptInteractive(): Promise<GenerateAppInput> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('\n=== The Lab App Generator ===\n');

    const appName = (await askQuestion(rl, 'Enter app name: ')).trim().toLowerCase();
    if (!appName) {
      throw new Error('App name cannot be empty.');
    }

    const appTypeRaw = (await askQuestion(rl, 'Enter app type (browser/server/hybrid): '))
      .trim()
      .toLowerCase();
    if (!APP_TYPES.includes(appTypeRaw as AppType)) {
      throw new Error('Invalid app type. Choose "browser", "server", or "hybrid".');
    }
    const appType = appTypeRaw as AppType;

    const appDescription = (await askQuestion(rl, 'Enter app description: ')).trim();
    if (!appDescription) {
      throw new Error('App description cannot be empty.');
    }

    const portInput =
      appType === 'server' || appType === 'hybrid'
        ? await askQuestion(rl, 'Enter port number (default 4000): ')
        : '';
    const port = portInput ? Number.parseInt(portInput.trim(), 10) || 4000 : 4000;

    const appOrderRaw = (await askQuestion(rl, 'Enter app display order: ')).trim();
    if (!appOrderRaw || Number.isNaN(Number.parseInt(appOrderRaw, 10))) {
      throw new Error('App order cannot be empty.');
    }
    const appOrder = Number.parseInt(appOrderRaw, 10);

    const appFaIcon = (await askQuestion(rl, 'Enter app fa icon: ')).trim();
    if (!appFaIcon) {
      throw new Error('App fa icon cannot be empty.');
    }

    const dependenciesInput = await askQuestion(
      rl,
      'Enter dependencies (comma-separated app IDs, press Enter to skip): ',
    );
    const dependencies = parseDependencies(dependenciesInput);

    return {
      appName,
      appType,
      appDescription,
      port,
      appOrder,
      appFaIcon,
      dependencies,
    };
  } finally {
    rl.close();
  }
}

async function runGenerate(input: GenerateAppInput): Promise<void> {
  const destDir = pathModule.join(process.cwd(), 'src/apps');
  const { appName, appType, appDescription, appFaIcon, appOrder, port, dependencies } = input;

  console.log(`\nGenerating ${appType} app: ${appName}...`);

  const folderSlug = templateGenerator.resolveAppFolderSlug(appName);
  const registryAppId = templateGenerator.resolveRegistryAppId(appName);
  const displayName = capitalize(folderSlug.replace(/-/g, ' '));

  const templateResult = await templateGenerator.generateApp(
    appName,
    displayName,
    appType,
    appDescription,
    appFaIcon,
    appOrder,
    destDir,
    true,
    port,
    undefined,
    dependencies,
  );

  if (templateResult.success) {
    console.log(`\nRegistered app id: ${registryAppId}`);
    console.log(`Folder: src/apps/${folderSlug}/`);
    console.log(`Generated ${templateResult.app.type} app: ${templateResult.app.name}`);
    console.log('\nNext: add seedApps row in apps-schema.ts for fresh installs if needed.');
  } else {
    console.error('Failed to generate app:', templateResult.error);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  registerDefaultPlatformAppsCatalog();

  try {
    const parsed = parseGenerateAppArgv(process.argv.slice(2));
    if (parsed === 'help') {
      printUsage();
      return;
    }

    const input = parsed ?? await promptInteractive();
    await runGenerate(input);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : 'Unknown error');
    printUsage();
    process.exit(1);
  }
}

const isCliEntry =
  typeof process.argv[1] === 'string' &&
  fileURLToPath(import.meta.url) === pathModule.resolve(process.argv[1]);

if (isCliEntry) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  });
}
