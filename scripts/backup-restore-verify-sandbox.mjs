#!/usr/bin/env node
/**
 * Sandbox restore verify (rm-46 step 4) — copies a backup to a temp tree and validates SQLite + Chroma layout.
 * Does not touch live db/ or chroma-data/.
 * Usage: node scripts/backup-restore-verify-sandbox.mjs [backupDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function latestBackupDir() {
  const backupsRoot = path.join(root, 'backups');
  if (!fs.existsSync(backupsRoot)) {
    throw new Error('No backups/ directory — run npm run backup:lab first');
  }
  const dirs = fs
    .readdirSync(backupsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('lab-') && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort();
  if (dirs.length === 0) {
    throw new Error('No lab-* backups found — run npm run backup:lab first');
  }
  return path.join(backupsRoot, dirs[dirs.length - 1]);
}

function copyTree(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function verifySqliteFile(dbPath, label) {
  if (!fs.existsSync(dbPath)) {
    return { label, ok: false, error: 'missing' };
  }
  const st = fs.statSync(dbPath);
  if (!st.isFile()) {
    return { label, ok: false, error: 'not a file (directory or other)' };
  }
  if (st.size === 0) {
    return { label, ok: false, error: 'empty file' };
  }
  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const integrity = db.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      return { label, ok: false, error: `integrity_check: ${integrity}` };
    }
    let users = null;
    try {
      users = db.prepare('SELECT COUNT(*) AS n FROM users').get()?.n ?? null;
    } catch {
      users = null;
    }
    return { label, ok: true, users };
  } catch (err) {
    return { label, ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    db?.close();
  }
}

const backupDir = process.argv[2] ? path.resolve(process.argv[2]) : latestBackupDir();
const manifestPath = path.join(backupDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error(`No manifest.json in ${backupDir}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sandboxRoot = path.join(root, 'backups', '_sandbox-restore-verify');
if (fs.existsSync(sandboxRoot)) {
  fs.rmSync(sandboxRoot, { recursive: true, force: true });
}
fs.mkdirSync(sandboxRoot, { recursive: true });

const results = [];

for (const rel of manifest.paths) {
  if (rel.endsWith('/')) {
    const src = path.join(backupDir, rel.replace(/\/$/, ''));
    const dest = path.join(sandboxRoot, rel.replace(/\/$/, ''));
    if (fs.existsSync(src)) {
      copyTree(src, dest);
      const chromaDb = path.join(dest, 'chroma.sqlite3');
      results.push({
        label: rel,
        ok: fs.existsSync(chromaDb),
        chromaSqlite: fs.existsSync(chromaDb),
      });
    }
    continue;
  }
  const src = path.join(backupDir, rel);
  const dest = path.join(sandboxRoot, rel);
  copyTree(src, dest);
  if (rel.endsWith('.db')) {
    results.push(verifySqliteFile(dest, rel));
  }
}

const failed = results.filter((r) => !r.ok);
const report = {
  backupDir,
  sandboxRoot,
  createdAt: manifest.createdAt,
  results,
  passed: failed.length === 0,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
