#!/usr/bin/env node
/**
 * Logical backup of THE-LAB state (rm-46 **5.1**).
 * Usage: node scripts/backup-lab-data.mjs [outputDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
  return true;
}

function copySqliteBundle(basePath, destDir) {
  const copied = copyIfExists(basePath, path.join(destDir, path.basename(basePath)));
  for (const suffix of ['-shm', '-wal']) {
    copyIfExists(`${basePath}${suffix}`, path.join(destDir, `${path.basename(basePath)}${suffix}`));
  }
  return copied;
}

const outRoot =
  process.argv[2] ??
  path.join(root, 'backups', `lab-${stamp()}`);

fs.mkdirSync(outRoot, { recursive: true });

const manifest = { createdAt: new Date().toISOString(), paths: [] };

const mainDb = path.join(root, 'db', 'the_lab.db');
if (copySqliteBundle(mainDb, path.join(outRoot, 'db'))) {
  manifest.paths.push('db/the_lab.db');
}

const appsRoot = path.join(root, 'src', 'apps');
if (fs.existsSync(appsRoot)) {
  for (const appId of fs.readdirSync(appsRoot, { withFileTypes: true })) {
    if (!appId.isDirectory()) continue;
    const appDb = path.join(appsRoot, appId.name, 'db', 'the_lab.db');
    if (fs.existsSync(appDb)) {
      const rel = `src/apps/${appId.name}/db/the_lab.db`;
      const destDir = path.join(outRoot, 'src', 'apps', appId.name, 'db');
      copySqliteBundle(appDb, destDir);
      manifest.paths.push(rel);
    }
  }
}

const chroma = path.join(root, 'chroma-data');
if (copyIfExists(chroma, path.join(outRoot, 'chroma-data'))) {
  manifest.paths.push('chroma-data/');
}

fs.writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Backup written to ${outRoot}`);
console.log(JSON.stringify(manifest, null, 2));
