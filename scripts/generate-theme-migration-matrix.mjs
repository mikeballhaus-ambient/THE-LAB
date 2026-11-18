/**
 * Generates plans/theming/migration-matrix.md (rm-49 Phase 49.0).
 * Run: node scripts/generate-theme-migration-matrix.mjs
 */
import fs from 'fs';
import path from 'path';

const OUT = 'plans/theming/migration-matrix.md';
const SRC = 'src';

const utilityRe =
  /(?:^|[\s"'`:])(?:hover:|focus:|active:|disabled:)?(bg|text|border|ring|from|to|via)-([a-z]+)-(\d{2,3})/g;

const STATUS_PALETTES = new Set(['red', 'green', 'emerald', 'yellow', 'amber', 'orange', 'rose', 'lime', 'teal', 'sky', 'blue', 'indigo', 'violet', 'purple', 'pink', 'fuchsia']);
const STRUCTURAL = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone', 'mist']);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', '.git'].includes(e.name)) walk(p, acc);
    else if (e.isFile() && /\.(vue|ts|tsx|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function norm(p) {
  return p.replace(/\\/g, '/');
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const utilities = {};
  let count = 0;
  let m;
  const re = new RegExp(utilityRe.source, 'g');
  while ((m = re.exec(content))) {
    count++;
    const key = `${m[1]}-${m[2]}-${m[3]}`;
    utilities[key] = (utilities[key] || 0) + 1;
  }
  const rgbCount = (content.match(/rgb\([^)]+\)/g) || []).length;
  const hexCount = (content.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
  let structural = 0;
  let status = 0;
  let brand = 0;
  let mist = 0;
  for (const [key, n] of Object.entries(utilities)) {
    const pal = key.split('-')[1];
    if (pal === 'mist') mist += n;
    else if (pal === 'cyan') brand += n;
    else if (STRUCTURAL.has(pal)) structural += n;
    else if (STATUS_PALETTES.has(pal)) status += n;
  }
  const topTokens = Object.entries(utilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}(${v})`)
    .join(', ');
  return { count, utilities, rgbCount, hexCount, structural, status, brand, mist, topTokens };
}

function inferClass(filePath, scan) {
  const n = norm(filePath);
  if (n.includes('/mcp/utils/') && n.endsWith('-format-result.ts')) return 'E';
  if (n.includes('useMcpToolFormatter.ts') || n.endsWith('/mcp/utils/base-utils.ts')) return 'E';
  if (n === 'src/main.ts' || n === 'src/services/AppLifecycle.ts') return 'B';
  if (n.includes('settings-ui.ts')) return 'B';
  if (n.includes('/shared/charts/') || /BarChart\.vue$/.test(n) || /ChartRuntime/.test(n)) return 'D';
  if (n.includes('app-instructions') || n.includes('platform-forms-seed')) return 'F';
  if (scan.count === 0 && (scan.rgbCount > 0 || scan.hexCount > 5)) return 'A';
  if (scan.status > scan.structural && scan.status >= 8) return 'C';
  if (scan.brand > scan.structural * 0.3 && scan.brand >= 10) return 'B';
  return 'A';
}

function inferWave(filePath) {
  const n = norm(filePath);
  if (n === 'src/main.ts' || n === 'src/services/AppLifecycle.ts') return 'W0';
  if (n === 'src/assets/styles/lab-app-shell.css' || n === 'src/assets/styles/tailwind.css') return 'W0';
  if (n.includes('/shared/theme/')) return 'W0';
  if (n === 'src/assets/styles/lab-theme.css') return 'W0';
  if (n.includes('settings-ui.ts')) return 'W1';
  if (n.includes('/dashboard/components/settings/')) return 'W1';
  if (n.includes('/dashboard/components/app/About.vue')) return 'W6';
  if (n.includes('/dashboard/components/app/')) return 'W1';
  if (n.includes('/dashboard/components/chat/') || n.includes('/dashboard/components/auth/')) return 'W2';
  if (n.includes('/dashboard/')) return 'W2';
  if (n.includes('/apps/forms-builder/')) return 'W3';
  if (n.includes('/shared/forms/')) return 'W3';
  if (/\/apps\/(crm|task-list|help-desk)\//.test(n)) return 'W4';
  if (n.includes('/shared/charts/')) return 'W4';
  if (n.includes('/mcp/')) return 'W5';
  if (n.includes('/apps/')) return 'W5';
  if (n.includes('/backend/')) return 'W5';
  if (n.includes('/shared/')) return 'W5';
  if (n.includes('/assets/styles/')) return 'W1';
  return 'W5';
}

function inferOwner(filePath) {
  const n = norm(filePath);
  if (n.startsWith('src/dashboard/') || n === 'src/main.ts' || n === 'src/services/AppLifecycle.ts') return 'platform-shell';
  if (n.startsWith('src/assets/')) return 'platform-shell';
  if (n.includes('/shared/composables/mcp/') || n.includes('/shared/components/')) return 'platform-shared';
  if (n.includes('/shared/charts/') || n.includes('/shared/forms/')) return 'platform-shared';
  const appMatch = n.match(/\/apps\/([^/]+)\//);
  if (appMatch) return `app-${appMatch[1]}`;
  if (n.startsWith('src/backend/')) return 'platform-backend';
  if (n.startsWith('src/shared/')) return 'platform-shared';
  if (n.startsWith('src/templates/')) return 'app-template';
  return 'platform';
}

function inferNotes(filePath, scan, wave, cls) {
  const n = norm(filePath);
  const bits = [];
  if (scan.mist > 0) bits.push(`mist:${scan.mist}`);
  if (scan.brand > 0) bits.push(`cyan:${scan.brand}`);
  if (scan.rgbCount > 0) bits.push(`rgb():${scan.rgbCount}`);
  if (n.endsWith('About.vue')) bits.push('dense marketing cards');
  if (n.includes('PropertyEditor')) bits.push('designer hotspot');
  if (cls === 'E') bits.push('HTML string literals');
  if (cls === 'F') bits.push('seed/agent docs');
  if (wave === 'W0' && cls === 'B') bits.push('PrimeVue pt/preset');
  return bits.join('; ') || '—';
}

const forcedInclude = [
  'src/main.ts',
  'src/services/AppLifecycle.ts',
  'src/assets/styles/lab-app-shell.css',
  'src/assets/styles/tailwind.css',
];

const rows = [];
const allFiles = walk(SRC);
const seen = new Set();

for (const f of allFiles) {
  const scan = scanFile(f);
  if (scan.count === 0 && scan.rgbCount === 0 && scan.hexCount < 3) continue;
  seen.add(norm(f));
  const nf = norm(f);
  const cls = inferClass(f, scan);
  const wave = inferWave(f);
  rows.push({
    path: nf,
    class: cls,
    utilities: scan.count,
    wave,
    owner: inferOwner(f),
    top: scan.topTokens || '—',
    notes: inferNotes(f, scan, wave, cls),
  });
}

for (const f of forcedInclude) {
  if (seen.has(f)) continue;
  if (!fs.existsSync(f)) continue;
  const scan = scanFile(f);
  rows.push({
    path: f,
    class: inferClass(f, scan),
    utilities: scan.count,
    wave: inferWave(f),
    owner: inferOwner(f),
    top: scan.topTokens || '—',
    notes: inferNotes(f, scan, inferWave(f), inferClass(f, scan)),
  });
}

rows.sort((a, b) => {
  const wo = { W0: 0, W1: 1, W2: 2, W3: 3, W4: 4, W5: 5, W6: 6 };
  if (wo[a.wave] !== wo[b.wave]) return wo[a.wave] - wo[b.wave];
  return b.utilities - a.utilities;
});

const waveSummary = {};
const classSummary = {};
let utilTotal = 0;
for (const r of rows) {
  utilTotal += r.utilities;
  waveSummary[r.wave] = (waveSummary[r.wave] || 0) + 1;
  classSummary[r.class] = (classSummary[r.class] || 0) + 1;
}

const esc = (s) => String(s).replace(/\|/g, '\\|');

let md = `# rm-49 — Theme migration matrix

**Generated:** ${new Date().toISOString().slice(0, 10)} · **Command:** \`node scripts/generate-theme-migration-matrix.mjs\`  
**Parent:** [INVENTORY.md](./INVENTORY.md) · [rm-49-theme-branding.md](./rm-49-theme-branding.md)

## Summary

| Metric | Value |
|--------|------:|
| Files in matrix | **${rows.length}** |
| Sum of palette utility hits | **${utilTotal}** |
| Waves | W0 engine → W1 shell/settings → W2 dashboard chat → W3 forms → W4 core apps → W5 long tail → W6 About content |

### Files per wave

| Wave | Files |
|------|------:|
${Object.keys({ W0: 0, W1: 0, W2: 0, W3: 0, W4: 0, W5: 0, W6: 0 })
  .map((w) => `| ${w} | ${waveSummary[w] || 0} |`)
  .join('\n')}

### Files per class

| Class | Files | Meaning |
|-------|------:|---------|
| A | ${classSummary.A || 0} | Theme surface |
| B | ${classSummary.B || 0} | Interactive / PrimeVue pt |
| C | ${classSummary.C || 0} | Semantic status colors |
| D | ${classSummary.D || 0} | Charts / data viz |
| E | ${classSummary.E || 0} | MCP HTML strings |
| F | ${classSummary.F || 0} | Seed / instructions |

## Full matrix

| Path | Class | Utilities | Wave | Owner | Top tokens | Notes |
|------|:-----:|----------:|:----:|-------|------------|-------|
`;

for (const r of rows) {
  md += `| \`${esc(r.path)}\` | ${r.class} | ${r.utilities} | ${r.wave} | ${r.owner} | ${esc(r.top)} | ${esc(r.notes)} |\n`;
}

md += `
## Regeneration

Re-run after each migration wave to refresh counts and drop completed rows from active planning:

\`\`\`bash
node scripts/generate-theme-migration-matrix.mjs
\`\`\`

Class **C** rows are often mixed into **A** files; migrate structural tokens first, keep status hues unless \`lab-status-*\` tokens are defined in 49.1.
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md, 'utf8');
console.log(`Wrote ${OUT} (${rows.length} rows, ${utilTotal} utilities)`);
