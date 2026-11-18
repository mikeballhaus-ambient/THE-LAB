import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * READ-ONLY: find files under src/apps that contain spliced tool-result payloads
 * or app-external prose. Reports the exact byte offset of the first contamination
 * and how much usable content precedes it.
 */
const ROOT = 'src/apps';

/** Markers that can only come from a chat transcript, never from app source. */
const MARKERS = [
  '{"type":"tool_result"',
  '{"type":"tool_use"',
  '{"type":"text","text":"<environment_details>',
  '<environment_details>',
  '"tool_use_id":"call_',
  '+"""\\n---\\n---',
];

const FALSE_POSITIVES = new Set([
  'src/shared/composables/mcp/useMcpToolFormatter.ts',
  'src/shared/templates/available-mcp-tools.md',
]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|vue|tsx|js|mjs)$/.test(e.name)) out.push(full.replace(/\\/g, '/'));
  }
  return out;
}

const files = walk(ROOT);
const rows = [];

for (const file of files) {
  if (FALSE_POSITIVES.has(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  let firstAt = -1;
  let marker = '';
  for (const m of MARKERS) {
    const i = text.indexOf(m);
    if (i >= 0 && (firstAt < 0 || i < firstAt)) {
      firstAt = i;
      marker = m;
    }
  }
  if (firstAt < 0) continue;

  const before = text.slice(0, firstAt);
  const linesBefore = before.split('\n').length;
  const bytes = statSync(file).size;

  rows.push({
    file,
    bytes,
    firstAt,
    linesBefore,
    tailBytes: bytes - firstAt,
    marker: marker.slice(0, 40),
  });
}

rows.sort((a, b) => a.file.localeCompare(b.file));
console.log(`contaminated files: ${rows.length}  (of ${files.length} scanned)\n`);
console.log('bytes    splice    good-lines  tail      file');
for (const r of rows) {
  console.log(
    `${String(r.bytes).padStart(7)}  ${String(r.firstAt).padStart(7)}  ${String(r.linesBefore).padStart(9)}  ${String(r.tailBytes).padStart(7)}   ${r.file}`,
  );
}

// Group by app for the report
const byApp = new Map();
for (const r of rows) {
  const app = r.file.split('/')[2];
  if (!byApp.has(app)) byApp.set(app, []);
  byApp.get(app).push(r.file);
}
console.log('\n--- by app ---');
for (const [app, list] of [...byApp].sort()) {
  console.log(`${app} (${list.length})`);
  list.forEach((f) => console.log(`   ${f}`));
}
