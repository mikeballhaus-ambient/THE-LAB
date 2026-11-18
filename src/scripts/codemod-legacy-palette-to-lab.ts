/**
 * rm-67.2 — Mechanical mist/slate Tailwind utilities → lab-* (idempotent).
 * Usage: tsx src/scripts/codemod-legacy-palette-to-lab.ts [glob roots...]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO = process.cwd();

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/bg-mist-950/g, 'bg-lab-general-bg-muted'],
  [/bg-mist-900/g, 'bg-lab-general-bg-muted'],
  [/bg-mist-800/g, 'bg-lab-general-bg-muted'],
  [/bg-mist-700/g, 'bg-lab-general-bg-muted'],
  [/border-mist-700/g, 'border-lab-general-border'],
  [/border-mist-600/g, 'border-lab-general-border'],
  [/text-mist-200/g, 'text-lab-general-text'],
  [/text-mist-100/g, 'text-lab-general-text'],
  [/text-mist-300/g, 'text-lab-general-text-muted'],
  [/text-mist-400/g, 'text-lab-general-text-muted'],
  [/text-mist-500/g, 'text-lab-general-text-muted'],
  [/bg-slate-950/g, 'bg-lab-general-bg-muted'],
  [/bg-slate-900/g, 'bg-lab-general-bg-muted'],
  [/bg-slate-800/g, 'bg-lab-general-bg-muted'],
  [/bg-slate-700/g, 'bg-lab-general-bg-muted'],
  [/bg-slate-600/g, 'bg-lab-general-bg-muted'],
  [/bg-slate-500/g, 'bg-lab-general-bg-muted'],
  [/border-slate-700/g, 'border-lab-general-border'],
  [/border-slate-600/g, 'border-lab-general-border'],
  [/border-slate-500/g, 'border-lab-general-border'],
  [/text-slate-100/g, 'text-lab-general-text'],
  [/text-slate-200/g, 'text-lab-general-text'],
  [/text-slate-300/g, 'text-lab-general-text-muted'],
  [/text-slate-400/g, 'text-lab-general-text-muted'],
  [/text-slate-500/g, 'text-lab-general-text-muted'],
  [/hover:bg-mist-700/g, 'hover:bg-lab-general-bg'],
  [/hover:bg-mist-800/g, 'hover:bg-lab-general-bg-muted'],
  [/hover:bg-slate-600/g, 'hover:bg-lab-general-bg-muted'],
  [/hover:text-slate-200/g, 'hover:text-lab-general-text'],
  [/hover:text-slate-400/g, 'hover:text-lab-general-text-muted'],
  [/hover:border-slate-400/g, 'hover:border-lab-button-border-hover'],
  [/border-slate-300/g, 'border-lab-button-border-hover'],
  [/border-slate-800/g, 'border-lab-general-border'],
  [/bg-mist-600/g, 'bg-lab-general-bg-muted'],
  [/text-mist-600/g, 'text-lab-general-text-muted'],
  [/border-mist-500/g, 'border-lab-general-border'],
  [/hover:border-mist-500/g, 'hover:border-lab-button-border-hover'],
  [/hover:border-mist-400/g, 'hover:border-lab-button-border-hover'],
  [/ring-mist-500/g, 'ring-lab-accent'],
  [/text-slate-600/g, 'text-lab-general-text-muted'],
  [/\btext-white\b/g, 'text-lab-general-text'],
];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dnd-examples', 'ui-component-gallery']);
const SKIP_FILES = ['codemod-legacy-palette-to-lab.ts', 'tailwind-color-resolve.test.ts', 'lab-app-palette.css', 'lab-theme.css'];

function walk(dir: string, out: string[]): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!/\.(vue|ts|tsx|css)$/.test(ent.name)) continue;
    if (SKIP_FILES.some((s) => ent.name.includes(s))) continue;
  if (ent.name.includes('app-instructions')) continue;
    out.push(abs);
  }
}

function transform(content: string): string {
  let next = content;
  for (const [re, rep] of REPLACEMENTS) {
    next = next.replace(re, rep);
  }
  return next;
}

const roots = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['src/dashboard', 'src/shared', 'src/apps'];

let changed = 0;
for (const root of roots) {
  const absRoot = join(REPO, root);
  const files: string[] = [];
  try {
    statSync(absRoot);
    walk(absRoot, files);
  } catch {
    continue;
  }
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    if (!/\b(text|bg|border)-(mist|slate)-/.test(before) && !/\btext-slate-\d/.test(before)) {
      continue;
    }
    const after = transform(before);
    if (after !== before) {
      writeFileSync(file, after, 'utf8');
      changed++;
      console.log(relative(REPO, file));
    }
  }
}
console.log(`[codemod-legacy-palette-to-lab] updated ${changed} file(s)`);
