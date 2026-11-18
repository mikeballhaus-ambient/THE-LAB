/**
 * rm-67.2 — Fail when product UI reintroduces dark-only palette utilities.
 *
 * Usage: npm run verify:theme-colors
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = ['src/dashboard', 'src/shared', 'src/apps'] as const;

const EXCLUDE_PATH_PARTS = [
  '/dnd-examples/',
  '/ui-component-gallery/',
  '/theme/presets/',
  'lab-theme-token-keys.ts',
  '/tests/',
  'codemod-legacy-palette-to-lab.ts',
  'verify-theme-colors.ts',
  '/app-instructions/',
];

const BANNED = /\b(text|bg|border|ring|from|to|via)-(mist|slate)-\d/;

function shouldScan(absPath: string): boolean {
  const rel = relative(REPO_ROOT, absPath).replace(/\\/g, '/');
  if (!rel.endsWith('.vue') && !rel.endsWith('.ts') && !rel.endsWith('.tsx')) {
    return false;
  }
  return !EXCLUDE_PATH_PARTS.some((part) => rel.includes(part));
}

function walk(dir: string, out: string[]): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (shouldScan(abs)) out.push(abs);
  }
}

export function verifyThemeColors(): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    walk(join(REPO_ROOT, root), files);
  }
  const errors: string[] = [];
  for (const file of files) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*')) return;
      if (BANNED.test(line)) {
        errors.push(`${rel}:${index + 1}: ${t}`);
      }
    });
  }
  return errors;
}

function main(): void {
  const errors = verifyThemeColors();
  if (errors.length > 0) {
    console.error('[verify:theme-colors] legacy mist/slate utilities in product UI:');
    for (const err of errors.slice(0, 40)) {
      console.error(`  - ${err}`);
    }
    if (errors.length > 40) {
      console.error(`  ... and ${errors.length - 40} more`);
    }
    process.exit(1);
  }
  console.log('[verify:theme-colors] ok');
}

main();
