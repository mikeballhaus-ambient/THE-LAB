#!/usr/bin/env node
/**
 * Platform-scoped ESLint for CI (see docs/ci/ci-v1-contract.md).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const eslintBin = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');

const targets = [
  'src/backend',
  'src/dashboard',
  'src/services',
  'src/shared',
  'src/scripts',
  'src/main.ts',
  'src/App.vue',
  'src/backend-entry.ts',
];

const args = [
  eslintBin,
  ...targets,
  '--config',
  'eslint.config.ci.js',
  '--max-warnings',
  '0',
];

const result = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' },
});

process.exit(result.status ?? 1);
