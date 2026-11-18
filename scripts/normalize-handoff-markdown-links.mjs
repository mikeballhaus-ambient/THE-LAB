/**
 * Rewrites markdown link targets to repo-root-relative paths (forward slashes).
 * Usage: node scripts/normalize-handoff-markdown-links.mjs [dir-or-file ...]
 * Default: plans/agent-handoff plans/rm-58-notification-hub plans/rm-59-rules-engine
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

const DEFAULT_TARGETS = [
  'plans/agent-handoff',
  'plans/rm-58-notification-hub',
  'plans/rm-59-rules-engine',
  'plans/roadmap/rm-58-notification-hub.md',
  'plans/roadmap/rm-59-rules-engine.md',
];

function walk(entryPath) {
  const abs = path.join(ROOT, entryPath);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];
  const out = [];
  for (const name of fs.readdirSync(abs)) {
    const child = path.join(abs, name);
    const st = fs.statSync(child);
    if (st.isDirectory()) out.push(...walk(path.relative(ROOT, child)));
    else if (name.endsWith('.md')) out.push(child);
  }
  return out;
}

function toRepoPath(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

function isAlreadyRootRelative(urlPath) {
  const prefixes = ['plans/', 'src/', 'docs/', 'scripts/', 'AGENTS.md', 'CLAUDE.md', '.cursorrules'];
  return prefixes.some((p) => urlPath === p || urlPath.startsWith(p));
}

function resolveLink(fromFile, rawUrl) {
  if (!rawUrl || rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('#')) {
    return rawUrl;
  }
  if (rawUrl.startsWith('mailto:')) return rawUrl;

  const hashIdx = rawUrl.indexOf('#');
  const urlPath = hashIdx >= 0 ? rawUrl.slice(0, hashIdx) : rawUrl;
  const hash = hashIdx >= 0 ? rawUrl.slice(hashIdx) : '';

  if (isAlreadyRootRelative(urlPath)) return rawUrl;

  const fromDir = path.dirname(fromFile);
  const resolved = path.normalize(path.join(fromDir, urlPath));
  if (!resolved.startsWith(ROOT)) return rawUrl;
  return `${toRepoPath(resolved)}${hash}`;
}

function fixFile(file) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/\]\(([^)]+)\)/g, (match, url) => `](${resolveLink(file, url.trim())})`);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log('updated', toRepoPath(file));
  }
}

const targets = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_TARGETS;
for (const t of targets) {
  for (const file of walk(t)) fixFile(file);
}
