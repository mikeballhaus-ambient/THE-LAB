/**
 * rm-67.1 — Fail when user-facing seed / provisioner strings embed roadmap ids `(rm-NN…)`.
 *
 * Usage: npm run verify:seed-copy
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = [
  'src/backend/lab-integrations',
  'src/backend/db/LabIntegrations',
  'src/backend/db/Tools',
  'src/backend/db/Apps',
  'src/backend/db/Command',
  'src/backend/db/Persona',
  'src/apps',
  'src/scripts',
] as const;

const EXCLUDE_PATH_PARTS = [
  '/app-instructions/',
  '/tests/',
  '\\tests\\',
  '.test.ts',
  '.test.tsx',
  '/mcp/mcp-servers/',
  '\\mcp\\mcp-servers\\',
  'integration-stub-markers.ts',
];

/** Parenthesized roadmap id in a string — the common product-data smell. */
const ROADMAP_IN_PARENS = /\(rm-\d+(?:\.\d+)?\)/;

function shouldScanFile(absPath: string): boolean {
  const rel = relative(REPO_ROOT, absPath).replace(/\\/g, '/');
  if (!rel.endsWith('.ts') && !rel.endsWith('.tsx') && !rel.endsWith('.sql')) {
    return false;
  }
  return !EXCLUDE_PATH_PARTS.some((part) => rel.includes(part.replace(/\\/g, '/')));
}

function walk(dir: string, out: string[]): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') {
        continue;
      }
      walk(abs, out);
      continue;
    }
    if (shouldScanFile(abs)) {
      out.push(abs);
    }
  }
}

function isCommentOnlyLine(trimmed: string): boolean {
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*/')
  );
}

function isLikelyUserFacingLine(line: string): boolean {
  const t = line.trim();
  if (isCommentOnlyLine(t)) {
    return false;
  }
  if (/\bconsole\.(log|info|warn|error)\s*\(/.test(t)) {
    return false;
  }
  if (ROADMAP_IN_PARENS.test(line) && /['"`]/.test(line)) {
    return true;
  }
  if (/\brm-\d+(?:\.\d+)?\b/.test(line) && /\bdescription\s*:/.test(line) && /['"`]/.test(line)) {
    return true;
  }
  if (/\brm-\d+(?:\.\d+)? stub\b/i.test(line) && /['"`]/.test(line)) {
    return true;
  }
  return false;
}

export function verifySeedRoadmapIds(): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const absRoot = join(REPO_ROOT, root);
    try {
      statSync(absRoot);
      walk(absRoot, files);
    } catch {
      // optional path
    }
  }

  const errors: string[] = [];
  for (const file of files) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isLikelyUserFacingLine(line)) {
        errors.push(`${rel}:${index + 1}: ${line.trim()}`);
      }
    });
  }
  return errors;
}

function main(): void {
  const errors = verifySeedRoadmapIds();
  if (errors.length > 0) {
    console.error('[verify:seed-copy] roadmap ids in user-facing seed strings:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log('[verify:seed-copy] ok — no roadmap ids in scanned seed/provisioner copy');
}

main();
