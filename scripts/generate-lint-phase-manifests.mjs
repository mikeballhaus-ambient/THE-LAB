#!/usr/bin/env node
/**
 * Bucket files from lint-inventory.json into executor phases (one bucket = fix ALL rules per file).
 * Large buckets are split for local agents (~10 files / ~45 errors per manifest max).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const inventory = JSON.parse(
  fs.readFileSync(path.join(root, 'plans/lab-lint-fixes/docs/lint-inventory.json'), 'utf8'),
);
const outDir = path.join(root, 'plans/lab-lint-fixes/docs/manifests');
fs.mkdirSync(outDir, { recursive: true });

const MAX_FILES_PER_MANIFEST = 10;
const MAX_ERRORS_PER_MANIFEST = 45;

function baseBucketFor(file) {
  if (file.startsWith('scripts/') || file === 'vite.config.ts') return '02-scripts-vite';
  if (file.startsWith('src/services/')) return '02-scripts-vite';
  if (file.startsWith('src/backend/db/')) return '03-backend-db';
  if (file.startsWith('src/backend/')) return '04-backend-other';
  if (file.startsWith('src/shared/types/')) return '05-shared-types';
  if (file.startsWith('src/shared/composables/mcp/')) return '06-shared-mcp-formatters';
  if (file.startsWith('src/shared/')) return '07-shared-other';
  if (file.startsWith('src/dashboard/')) return '08-dashboard';
  if (file.startsWith('src/tests/')) return '09-tests';
  if (file.startsWith('src/scripts/')) return '10-src-scripts';
  if (file.startsWith('src/apps/forms-builder/')) return '11-apps-forms-builder';
  if (file.startsWith('src/apps/')) return '12-apps-other';
  return '13-misc';
}

/** Refine coarse buckets into local-agent-sized groups before numeric chunking. */
function refineBucket(baseId, file) {
  if (baseId === '04-backend-other') {
    if (file.includes('/mcp/')) return '04-backend-mcp';
    if (file.startsWith('src/backend/routes/')) return '04-backend-routes';
    if (file.startsWith('src/backend/ai/')) return '04-backend-ai';
    if (file.includes('/utils/chat/')) return '04-backend-chat';
    if (file.startsWith('src/backend/utils/')) return '04-backend-utils';
    return '04-backend-core';
  }
  if (baseId === '07-shared-other') {
    if (file.startsWith('src/shared/composables/')) return '07-shared-composables';
    if (file.startsWith('src/shared/services/')) return '07-shared-services';
    if (file.startsWith('src/shared/charts/') || file.startsWith('src/shared/theme/')) {
      return '07-shared-theme-charts';
    }
    return '07-shared-misc';
  }
  if (baseId === '11-apps-forms-builder') {
    if (file.includes('/front-end/')) return '11-forms-fe';
    if (file.includes('/back-end/')) return '11-forms-be';
    return '11-forms-shared';
  }
  if (baseId === '12-apps-other') {
    const m = file.match(/^src\/apps\/([^/]+)/);
    if (m && m[1] !== 'forms-builder') return `12-app-${m[1]}`;
    return '12-apps-misc';
  }
  if (baseId === '09-tests') {
    if (file.includes('/backend/')) return '09-tests-backend';
    if (file.includes('/shared/')) return '09-tests-shared';
    if (file.includes('/e2e/')) return '09-tests-e2e';
    return '09-tests-misc';
  }
  if (baseId === '08-dashboard') {
    if (file.includes('/components/settings/')) return '08-dashboard-settings';
    if (file.includes('/components/chat/')) return '08-dashboard-chat';
    if (file.includes('/components/')) return '08-dashboard-components';
    return '08-dashboard-shell';
  }
  return baseId;
}

const bucketMeta = {
  '02-scripts-vite': 'Scripts, vite.config, src/services',
  '03-backend-db': 'src/backend/db/**',
  '04-backend-mcp': 'src/backend/mcp/**',
  '04-backend-routes': 'src/backend/routes/**',
  '04-backend-ai': 'src/backend/ai/**',
  '04-backend-chat': 'src/backend/utils/chat/**',
  '04-backend-utils': 'src/backend/utils/** (excluding chat/)',
  '04-backend-core': 'src/backend top-level (AppManager, server, middleware, …)',
  '05-shared-types': 'src/shared/types/**',
  '06-shared-mcp-formatters': 'src/shared/composables/mcp/**',
  '07-shared-composables': 'src/shared/composables/** (excluding mcp formatters)',
  '07-shared-services': 'src/shared/services/**',
  '07-shared-theme-charts': 'src/shared/theme/** and charts/**',
  '07-shared-misc': 'src/shared/** (remainder)',
  '08-dashboard-settings': 'src/dashboard/components/settings/**',
  '08-dashboard-chat': 'src/dashboard/components/chat/**',
  '08-dashboard-components': 'src/dashboard/components/** (other)',
  '08-dashboard-shell': 'src/dashboard/** (shell, composables, …)',
  '09-tests-backend': 'src/tests/backend/**',
  '09-tests-shared': 'src/tests/shared/**',
  '09-tests-e2e': 'src/tests/e2e/**',
  '09-tests-misc': 'src/tests/** (remainder)',
  '10-src-scripts': 'src/scripts/**',
  '11-forms-fe': 'forms-builder front-end',
  '11-forms-be': 'forms-builder back-end',
  '11-forms-shared': 'forms-builder shared/db',
  '13-misc': 'Remaining paths (templates, etc.)',
};

function chunkBucket(id, files) {
  const sorted = [...files].sort((a, b) => b.errors - a.errors || a.file.localeCompare(b.file));
  const chunks = [];
  let current = [];
  let errSum = 0;

  for (const f of sorted) {
    const wouldExceed =
      current.length >= MAX_FILES_PER_MANIFEST ||
      (current.length > 0 && errSum + f.errors > MAX_ERRORS_PER_MANIFEST);
    if (wouldExceed) {
      chunks.push(current);
      current = [];
      errSum = 0;
    }
    current.push(f);
    errSum += f.errors;
  }
  if (current.length) chunks.push(current);

  if (chunks.length === 1) return [[id, chunks[0]]];

  return chunks.map((chunk, i) => [`${id}-${String(i + 1).padStart(2, '0')}`, chunk]);
}

const buckets = {};
for (const f of inventory.files) {
  const base = baseBucketFor(f.file);
  const b = refineBucket(base, f.file);
  if (!buckets[b]) buckets[b] = [];
  buckets[b].push(f);
  if (!bucketMeta[b] && b.startsWith('12-app-')) {
    bucketMeta[b] = `src/apps/${b.replace('12-app-', '')}/**`;
  }
}

const manifestIndex = [];
for (const [id, files] of Object.entries(buckets).sort()) {
  for (const [manifestId, chunk] of chunkBucket(id, files)) {
    manifestIndex.push(manifestId);
    const errCount = chunk.reduce((a, f) => a + f.errors, 0);
    const title = bucketMeta[manifestId] ?? bucketMeta[id] ?? manifestId;
    const lines = [
      `# Manifest: ${manifestId}`,
      '',
      title,
      '',
      `Files: **${chunk.length}** · Errors to clear: **${errCount}**`,
      '',
      '**Executor:** Fix **every** ESLint error in each file (all rules). **One Roo task = this manifest only.**',
      '',
      '## Files',
      '',
      ...chunk.map((f) => {
        const ruleStr = Object.entries(f.rules)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ');
        return `- \`${f.file}\` — ${f.errors} (${ruleStr})`;
      }),
      '',
      'Line numbers: [lint-errors-line-level.md](../lint-errors-line-level.md) (search filename).',
      '',
      '## Verify',
      '',
      '```bash',
      `npm run verify-lint-phase -- ${manifestId}`,
      '```',
      '',
    ];
    fs.writeFileSync(path.join(outDir, `${manifestId}.md`), lines.join('\n'));
  }
}

// Remove legacy monolithic manifests if present
for (const legacy of [
  '04-backend-other.md',
  '07-shared-other.md',
  '08-dashboard.md',
  '09-tests.md',
  '11-apps-forms-builder.md',
  '12-apps-other.md',
]) {
  const p = path.join(outDir, legacy);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

fs.writeFileSync(
  path.join(root, 'plans/lab-lint-fixes/docs/manifest-index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), order: manifestIndex }, null, 2),
);

console.log('Manifests:', manifestIndex.length, '(local-agent sub-phases)');
console.log(manifestIndex.join('\n'));
