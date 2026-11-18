#!/usr/bin/env node
/**
 * Copy docs/wiki/*.md (except README.md) into the repo's GitHub Wiki git and push.
 *
 * Usage:
 *   npm run sync:github-wiki
 *
 * Env:
 *   GITHUB_REPOSITORY  owner/repo (default: parse from origin remote)
 *   GITHUB_TOKEN       push token (Actions: secrets.GITHUB_TOKEN; local: gh auth token)
 *   WIKI_DRY_RUN=1     copy only, no commit/push
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'docs', 'wiki');

const EXCLUDE = new Set(['README.md']);
const DRY_RUN = process.env.WIKI_DRY_RUN === '1';

function run(cmd, options = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
  });
}

function resolveRepository() {
  if (process.env.GITHUB_REPOSITORY?.includes('/')) {
    return process.env.GITHUB_REPOSITORY.trim();
  }
  const url = run('git remote get-url origin', { capture: true, cwd: repoRoot }).trim();
  const ssh = url.match(/git@github\.com:(.+?)\.git$/);
  if (ssh) {
    return ssh[1];
  }
  const https = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(\.git)?$/);
  if (https) {
    return `${https[1]}/${https[2]}`;
  }
  throw new Error(`Could not parse GitHub owner/repo from origin: ${url}`);
}

function resolveToken() {
  const token =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.WIKI_PUSH_TOKEN?.trim();
  if (token) {
    return token;
  }
  try {
    return run('gh auth token', { capture: true }).trim();
  } catch {
    return '';
  }
}

function listWikiSources() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing ${sourceDir}`);
  }
  return fs
    .readdirSync(sourceDir)
    .filter((name) => name.endsWith('.md') && !EXCLUDE.has(name))
    .sort();
}

function main() {
  const files = listWikiSources();
  if (files.length === 0) {
    console.error('No wiki pages found under docs/wiki/ (excluding README.md).');
    process.exit(1);
  }

  const repository = resolveRepository();
  const token = resolveToken();
  if (!token && !DRY_RUN) {
    console.error(
      'Set GITHUB_TOKEN (or run `gh auth login`) to push to the wiki repository.',
    );
    process.exit(1);
  }

  const wikiDir = fs.mkdtempSync(path.join(os.tmpdir(), 'the-lab-wiki-'));
  const cloneUrl = token
    ? `https://x-access-token:${token}@github.com/${repository}.wiki.git`
  : `https://github.com/${repository}.wiki.git`;

  console.log(`Syncing ${files.length} page(s) → ${repository} wiki`);

  try {
    try {
      run(`git clone --depth 1 "${cloneUrl}" .`, { cwd: wikiDir });
    } catch {
      console.error(
        `Wiki clone failed. Enable Wikis in repo settings and create Home once:\n` +
          `  https://github.com/${repository}/wiki`,
      );
      process.exit(1);
    }

    for (const name of files) {
      fs.copyFileSync(path.join(sourceDir, name), path.join(wikiDir, name));
    }

    if (process.env.GITHUB_ACTIONS === 'true') {
      run('git config user.name "github-actions[bot]"', { cwd: wikiDir });
      run('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', {
        cwd: wikiDir,
      });
    }

    const status = run('git status --porcelain', { capture: true, cwd: wikiDir }).trim();
    if (!status) {
      console.log('Wiki already up to date.');
      return;
    }

    console.log(status);

    if (DRY_RUN) {
      console.log('WIKI_DRY_RUN=1 — skipping commit/push.');
      return;
    }

    run('git add -A', { cwd: wikiDir });
    const msg = `Sync from docs/wiki (${new Date().toISOString().slice(0, 10)})`;
    run(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { cwd: wikiDir });
    run('git push origin HEAD', { cwd: wikiDir });
    console.log('Wiki push complete.');
  } finally {
    fs.rmSync(wikiDir, { recursive: true, force: true });
  }
}

main();