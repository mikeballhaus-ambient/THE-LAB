/**
 * rm-46 Phase 0.1 — repository size / `any` hotspot baseline.
 * Run: npm run metrics:baseline
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'metrics', 'metrics-baseline.md');

const SCAN_ROOTS = ['src/backend/routes', 'src/apps'];
const TS_EXT = new Set(['.ts', '.tsx', '.vue']);

interface FileStat {
  rel: string;
  lines: number;
  anyCount: number;
}

function walk(dir: string, out: FileStat[]): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, out);
    } else if (st.isFile()) {
      const ext = path.extname(name);
      if (!TS_EXT.has(ext)) continue;
      const rel = path.relative(ROOT, full).replace(/\\/g, '/');
      const text = fs.readFileSync(full, 'utf8');
      const lines = text.split(/\r?\n/).length;
      const anyMatches = text.match(/:\s*any\b|as any\b|<any>|Array<any>/g);
      out.push({ rel, lines, anyCount: anyMatches?.length ?? 0 });
    }
  }
}

function collectUnder(prefix: string): FileStat[] {
  const stats: FileStat[] = [];
  const base = path.join(ROOT, prefix);
  if (prefix === 'src/apps') {
    if (!fs.existsSync(base)) return stats;
    for (const appId of fs.readdirSync(base)) {
      const backEnd = path.join(base, appId, 'back-end');
      walk(backEnd, stats);
    }
  } else {
    walk(base, stats);
  }
  return stats;
}

const allStats: FileStat[] = [];
for (const root of SCAN_ROOTS) {
  allStats.push(...collectUnder(root));
}

const srcStats: FileStat[] = [];
walk(path.join(ROOT, 'src'), srcStats);

const topByLines = [...srcStats].sort((a, b) => b.lines - a.lines).slice(0, 25);
const anyHotspots = [...allStats].filter((s) => s.anyCount > 0).sort((a, b) => b.anyCount - a.anyCount).slice(0, 25);

const totalAny = allStats.reduce((n, s) => n + s.anyCount, 0);
const generated = `# rm-46 metrics baseline

**Generated:** ${new Date().toISOString().slice(0, 10)} via \`npm run metrics:baseline\`  
**Regenerate:** after major refactors; compare Phase 2 gate (**2.6**).

## Summary

| Metric | Value |
|--------|-------|
| Files scanned (\`src/backend/routes\` + \`src/apps/*/back-end\`) | ${allStats.length} |
| \`any\` occurrences (heuristic) in those paths | ${totalAny} |
| Top-level \`src/**\` files counted | ${srcStats.length} |

## Top 25 largest files under \`src/\` (by line count)

| Lines | \`any\` (file) | Path |
|------:|---------------:|------|
${topByLines.map((s) => `| ${s.lines} | ${s.anyCount} | \`${s.rel}\` |`).join('\n')}

## \`any\` hotspots (\`backend/routes\` + app \`back-end\`)

| \`any\` count | Lines | Path |
|-------------:|------:|------|
${anyHotspots.length ? anyHotspots.map((s) => `| ${s.anyCount} | ${s.lines} | \`${s.rel}\` |`).join('\n') : '| — | — | _none in scan paths_ |'}

## Runtime hooks (Phase 0.2)

| Signal | Where |
|--------|--------|
| \`[TEMPLATE-MANAGER] init() completed in …ms\` | \`template-manager.ts\` |
| \`fetchRepoFiles(): … (call #N)\` | \`file-helpers.ts\` — \`getFetchRepoFilesCallCount()\` |

---

_Phase 0 gate: store this file + green CI (**0.3**, **0.6**)._
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, generated, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
