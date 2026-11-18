/**
 * Inventory Vue SFC <style> blocks (rm-67 audit; re-runnable).
 *
 * Usage: npm run audit:vue-styles
 * Writes: docs/archive/programmes/rm-67/inventory.json, inventory-summary.md
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { basename, join, posix, relative } from 'path';

type StyleBucket = 'S' | 'M' | 'L' | 'X';

export type VueStyleInventoryRow = {
  path: string;
  styleLines: number;
  scoped: boolean;
  selectors: string[];
  colors: string[];
  deepCount: number;
  bucket: StyleBucket;
  appId: string | null;
  layer: 'dashboard' | 'shared' | 'apps' | 'templates';
  orphanSelectors: string[];
};

const REPO_ROOT = process.cwd();
const OUT_DIR = join(REPO_ROOT, 'docs', 'archive', 'programmes', 'rm-67');
const INVENTORY_JSON = join(OUT_DIR, 'inventory.json');
const SUMMARY_MD = join(OUT_DIR, 'inventory-summary.md');

const SCAN_ROOTS: Array<{ root: string; layer: VueStyleInventoryRow['layer']; globFrontEndOnly?: boolean }> = [
  { root: 'src/dashboard', layer: 'dashboard' },
  { root: 'src/shared', layer: 'shared' },
  { root: 'src/apps', layer: 'apps', globFrontEndOnly: true },
  { root: 'src/templates/front-end', layer: 'templates' },
];

/**
 * Exempt-candidate filename heuristics (roadmap bucket X).
 * Case-sensitive Table/Board/Canvas avoids Sortable/Dashboard false positives.
 */
const EXEMPT_FILENAME_RE =
  /Billiards|Klondike|WeatherMap|3D|GameBoard|DesignCanvas|GraphCanvas|GridCanvas|TableSurface|TableChrome|Table3D|DropZone|BoardCell|BoardStaged|(?:^|[^a-z])(?:Table|Canvas|Board)/;

const COLOR_SMELL_RE =
  /#[0-9a-fA-F]{3,8}\b|\brgb\s*\(|\brgba\s*\(|\bhsl\s*\(|\bslate-|\bcyan-|\bzinc-/g;

const CLASS_SELECTOR_RE = /\.([a-zA-Z_][\w-]*)/g;

function walkVueFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkVueFiles(full, out);
    } else if (name.endsWith('.vue')) {
      out.push(full);
    }
  }
}

function toForwardPath(p: string): string {
  return posix.normalize(relative(REPO_ROOT, p).split(/[/\\]/).join('/'));
}

function extractStyleBlocks(source: string): Array<{ content: string; scoped: boolean }> {
  const blocks: Array<{ content: string; scoped: boolean }> = [];
  const re = /<style(\s[^>]*)?>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const attrs = m[1] ?? '';
    const scoped = /\bscoped\b/i.test(attrs);
    blocks.push({ content: m[2] ?? '', scoped });
  }
  return blocks;
}

function countStyleLines(blocks: Array<{ content: string }>): number {
  let total = 0;
  for (const b of blocks) {
    const lines = b.content.split(/\r?\n/);
    total += lines.length;
  }
  return total;
}

function extractSelectors(styleText: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(CLASS_SELECTOR_RE.source, 'g');
  while ((m = re.exec(styleText)) !== null) {
    const cls = m[1];
    if (!cls) continue;
    if (cls === 'deep' || cls === 'global') continue;
    found.add(cls);
  }
  return [...found].sort();
}

function extractColors(styleText: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(COLOR_SMELL_RE.source, 'gi');
  while ((m = re.exec(styleText)) !== null) {
    const token = m[0].trim();
    if (token.length > 0) found.add(token);
  }
  return [...found].sort();
}

function countDeep(styleText: string): number {
  const patterns = [/:deep\b/g, /::v-deep\b/g, /\/deep\//g, /:global\b/g];
  let total = 0;
  for (const p of patterns) {
    const m = styleText.match(p);
    total += m?.length ?? 0;
  }
  return total;
}

function templateUsesClass(template: string, className: string): boolean {
  const patterns = [
    new RegExp(`\\b${className}\\b`, 'i'),
    new RegExp(`['"\`]${className}['"\`]`, 'i'),
  ];
  return patterns.some((p) => p.test(template));
}

function orphanSelectors(template: string, selectors: string[]): string[] {
  return selectors.filter((s) => !templateUsesClass(template, s));
}

function resolveAppId(forwardPath: string): string | null {
  const m = forwardPath.match(/^src\/apps\/([^/]+)\//);
  return m?.[1] ?? null;
}

function assignBucket(
  forwardPath: string,
  fileName: string,
  styleLines: number,
  selectors: string[],
  colors: string[],
  deepCount: number,
): StyleBucket {
  if (EXEMPT_FILENAME_RE.test(fileName)) return 'X';
  const manyDeep = deepCount >= 5;
  if (styleLines >= 120 || manyDeep) return 'L';
  const hasHex = colors.some((c) => c.startsWith('#'));
  if (styleLines < 40 && !hasHex && selectors.length <= 2) return 'S';
  return 'M';
}

function collectScanPaths(): string[] {
  const files: string[] = [];
  for (const { root, globFrontEndOnly } of SCAN_ROOTS) {
    const abs = join(REPO_ROOT, root);
    if (!existsSync(abs)) continue;
    if (globFrontEndOnly && root === 'src/apps') {
      for (const appDir of readdirSync(abs)) {
        const fe = join(abs, appDir, 'front-end');
        if (existsSync(fe) && statSync(fe).isDirectory()) {
          walkVueFiles(fe, files);
        }
      }
    } else {
      walkVueFiles(abs, files);
    }
  }
  return files.sort();
}

function analyzeFile(absPath: string, layer: VueStyleInventoryRow['layer']): VueStyleInventoryRow | null {
  const source = readFileSync(absPath, 'utf8');
  const blocks = extractStyleBlocks(source);
  if (blocks.length === 0) return null;

  const styleText = blocks.map((b) => b.content).join('\n');
  const scoped = blocks.every((b) => b.scoped) && blocks.some((b) => b.scoped);
  const styleLines = countStyleLines(blocks);
  const selectors = extractSelectors(styleText);
  const colors = extractColors(styleText);
  const deepCount = countDeep(styleText);

  const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  const template = templateMatch?.[1] ?? '';
  const orphans = orphanSelectors(template, selectors);

  const forwardPath = toForwardPath(absPath);
  const fileName = basename(absPath);
  const bucket = assignBucket(forwardPath, fileName, styleLines, selectors, colors, deepCount);

  return {
    path: forwardPath,
    styleLines,
    scoped: blocks.length > 0 && blocks.every((b) => b.scoped || blocks.length === 1)
      ? blocks[0]?.scoped ?? false
      : scoped,
    selectors,
    colors,
    deepCount,
    bucket,
    appId: resolveAppId(forwardPath),
    layer,
    orphanSelectors: orphans,
  };
}

function layerForPath(absPath: string): VueStyleInventoryRow['layer'] {
  const rel = toForwardPath(absPath);
  if (rel.startsWith('src/dashboard/')) return 'dashboard';
  if (rel.startsWith('src/shared/')) return 'shared';
  if (rel.startsWith('src/templates/')) return 'templates';
  return 'apps';
}

function buildInventory(): VueStyleInventoryRow[] {
  const paths = collectScanPaths();
  const rows: VueStyleInventoryRow[] = [];
  for (const abs of paths) {
    const row = analyzeFile(abs, layerForPath(abs));
    if (row) rows.push(row);
  }
  return rows;
}

function mdTable(headers: string[], bodyRows: string[][]): string {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = bodyRows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}`;
}

function writeSummary(rows: VueStyleInventoryRow[]): void {
  const byLayer = {
    dashboard: rows.filter((r) => r.layer === 'dashboard').length,
    shared: rows.filter((r) => r.layer === 'shared').length,
    apps: rows.filter((r) => r.layer === 'apps').length,
    templates: rows.filter((r) => r.layer === 'templates').length,
  };

  const byBucket: Record<StyleBucket, number> = { S: 0, M: 0, L: 0, X: 0 };
  for (const r of rows) byBucket[r.bucket] += 1;

  const appCounts = new Map<string, number>();
  for (const r of rows) {
    if (!r.appId) continue;
    appCounts.set(r.appId, (appCounts.get(r.appId) ?? 0) + 1);
  }
  const appRows = [...appCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, n]) => [id, String(n)]);

  const top30 = [...rows].sort((a, b) => b.styleLines - a.styleLines).slice(0, 30);
  const top30Rows = top30.map((r) => [
    r.path,
    String(r.styleLines),
    r.bucket,
    String(r.deepCount),
    String(r.colors.length),
    String(r.selectors.length),
  ]);

  const appsWithFrontEnd = new Set<string>();
  const appsRoot = join(REPO_ROOT, 'src', 'apps');
  if (existsSync(appsRoot)) {
    for (const appDir of readdirSync(appsRoot)) {
      const fe = join(appsRoot, appDir, 'front-end');
      if (existsSync(fe) && statSync(fe).isDirectory()) appsWithFrontEnd.add(appDir);
    }
  }
  const inventoriedApps = new Set(rows.filter((r) => r.appId).map((r) => r.appId!));
  const missingApps = [...appsWithFrontEnd].filter((id) => !inventoriedApps.has(id)).sort();

  const lines: string[] = [
    '# rm-67 — Vue style block inventory',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## Totals',
    '',
    `- Files with \`<style>\`: **${rows.length}**`,
    `- Dashboard: ${byLayer.dashboard} · Shared: ${byLayer.shared} · Apps: ${byLayer.apps} · Templates: ${byLayer.templates}`,
    `- Buckets: S=${byBucket.S}, M=${byBucket.M}, L=${byBucket.L}, X=${byBucket.X}`,
    '',
    '## By layer',
    '',
    mdTable(['Layer', 'Files'], Object.entries(byLayer).map(([k, v]) => [k, String(v)])),
    '',
    '## By app-id (front-end)',
    '',
    appRows.length > 0
      ? mdTable(['app-id', 'files with style'], appRows)
      : '_No app front-end style blocks._',
    '',
    '## Top 30 by style line count',
    '',
    mdTable(['path', 'styleLines', 'bucket', ':deep/:global', 'color smells', 'selectors'], top30Rows),
    '',
    '## Apps with front-end but zero style blocks',
    '',
    missingApps.length > 0 ? missingApps.map((id) => `- \`${id}\``).join('\n') : '_None — every app with front-end has at least one styled file, or has no Vue files with style._',
    '',
    '## Bucket L + X (manual review — phase 0.3)',
    '',
  ];

  const lx = rows
    .filter((r) => r.bucket === 'L' || r.bucket === 'X')
    .sort((a, b) => b.styleLines - a.styleLines);
  lines.push(
    mdTable(
      ['path', 'bucket', 'styleLines', 'deep', 'notes'],
      lx.map((r) => [r.path, r.bucket, String(r.styleLines), String(r.deepCount), '']),
    ),
  );

  writeFileSync(SUMMARY_MD, lines.join('\n'), 'utf8');
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = buildInventory();
  writeFileSync(INVENTORY_JSON, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  writeSummary(rows);
  console.log(`[audit:vue-styles] ${rows.length} files → ${toForwardPath(INVENTORY_JSON)}`);
  console.log(`[audit:vue-styles] summary → ${toForwardPath(SUMMARY_MD)}`);
}

main();
