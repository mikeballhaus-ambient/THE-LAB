import fs from 'fs';
import path from 'path';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '.git'].includes(e.name)) walk(p, acc);
    else if (e.isFile() && /\.(vue|ts|tsx|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const utilityRe =
  /(?:^|[\s"'`:])(?:hover:|focus:|active:|disabled:)?(bg|text|border|ring|from|to|via)-([a-z]+)-(\d{2,3})/g;
const rgbRe = /rgb\([^)]+\)|#[0-9a-fA-F]{3,8}/g;

const palette = {};
const files = new Set();
let total = 0;
let rgbHits = 0;
const byArea = { dashboard: 0, apps: 0, shared: 0, backend: 0, assets: 0, other: 0 };
const fileCounts = [];

for (const f of walk('src')) {
  const c = fs.readFileSync(f, 'utf8');
  let n = 0;
  let m;
  while ((m = utilityRe.exec(c))) {
    total++;
    n++;
    const key = `${m[1]}-${m[2]}-${m[3]}`;
    palette[key] = (palette[key] || 0) + 1;
  }
  const rgb = c.match(rgbRe);
  if (rgb) rgbHits += rgb.length;
  if (n > 0) {
    files.add(f);
    fileCounts.push({ f, n });
    const norm = f.replace(/\\/g, '/');
    if (norm.includes('/dashboard/')) byArea.dashboard++;
    else if (norm.includes('/apps/')) byArea.apps++;
    else if (norm.includes('/shared/')) byArea.shared++;
    else if (norm.includes('/backend/')) byArea.backend++;
    else if (norm.includes('/assets/')) byArea.assets++;
    else byArea.other++;
  }
}

fileCounts.sort((a, b) => b.n - a.n);

const top = Object.entries(palette).sort((a, b) => b[1] - a[1]).slice(0, 30);
const vueOnly = fileCounts.filter((x) => x.f.endsWith('.vue'));

console.log(JSON.stringify({
  totalUtilityMatches: total,
  filesWithColorUtilities: files.size,
  vueFilesWithMatches: vueOnly.length,
  rawRgbOrHexSubstringHits: rgbHits,
  filesByArea: byArea,
  topUtilities: top,
  topVueFiles: vueOnly.slice(0, 15).map((x) => ({ file: x.f.replace(/\\/g, '/'), count: x.n })),
}, null, 2));
