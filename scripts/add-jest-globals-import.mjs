import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const DEFAULT_ROOTS = [
  path.join(root, 'src', 'tests'),
  path.join(root, 'src', 'apps', 'forms-builder'),
];

function resolveScanRoots() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
  if (args.length === 0) return DEFAULT_ROOTS;
  return args.map((rel) => path.resolve(root, rel));
}

const JEST_GLOBALS = [
  'describe',
  'test',
  'it',
  'expect',
  'beforeAll',
  'afterAll',
  'beforeEach',
  'afterEach',
  'jest',
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.test\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function detectUsedGlobals(content) {
  const used = [];
  for (const name of JEST_GLOBALS) {
    const re = new RegExp(`\\b${name}\\b`);
    if (re.test(content)) used.push(name);
  }
  return used;
}

function hasJestImport(content) {
  return /@jest\/globals/.test(content);
}

function buildImport(used) {
  const order = JEST_GLOBALS.filter((n) => used.includes(n));
  if (order.length === 0) return null;
  return `import { ${order.join(', ')} } from '@jest/globals';\n`;
}

function prependImport(filePath, importLine) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (hasJestImport(content)) return false;
  const used = detectUsedGlobals(content);
  const line = importLine ?? buildImport(used);
  if (!line) return false;
  const next = line + (content.startsWith('\n') ? content : content);
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

const dryRun = process.argv.includes('--dry-run');
const scanRoots = resolveScanRoots();
const files = scanRoots.flatMap((dir) => (fs.existsSync(dir) ? walk(dir) : []));
let updated = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (hasJestImport(content)) continue;
  const used = detectUsedGlobals(content);
  const line = buildImport(used);
  if (!line) continue;
  if (dryRun) {
    console.log(path.relative(root, file), '->', line.trim());
  } else {
    prependImport(file, line);
    updated += 1;
  }
}
console.log(
  dryRun
    ? `Scanned ${files.length} test files under ${scanRoots.map((d) => path.relative(root, d)).join(', ')}`
    : `Updated ${updated} of ${files.length} scanned files`,
);
