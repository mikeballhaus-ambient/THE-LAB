#!/usr/bin/env node
/**
 * Generate phase/*.md + IMPLEMENTATION-PLAN run-order table from docs/manifest-index.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const planDir = path.join(root, 'plans/lab-lint-fixes');
const phasesDir = path.join(planDir, 'phases');
const manifestsDir = path.join(planDir, 'docs/manifests');
const indexPath = path.join(planDir, 'docs/manifest-index.json');

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const order = index.order;

function parseManifestStats(manifestId) {
  const text = fs.readFileSync(path.join(manifestsDir, `${manifestId}.md`), 'utf8');
  const filesM = text.match(/Files: \*\*(\d+)\*\*/);
  const errM = text.match(/Errors to clear: \*\*(\d+)\*\*/);
  return {
    files: filesM ? Number(filesM[1]) : 0,
    errors: errM ? Number(errM[1]) : 0,
  };
}

const rows = [];
rows.push({
  step: 0,
  phase: 'phases/00-agent-rules.md',
  files: '—',
  errors: '—',
  manifest: 'Read only',
});
rows.push({
  step: 1,
  phase: 'phases/01-inventory-baseline.md',
  files: '—',
  errors: '—',
  manifest: 'Regenerate docs',
});

let runStep = 2;
let prevManifest = null;
for (const manifestId of order) {
  const stats = parseManifestStats(manifestId);
  const phaseFile = `phases/${manifestId}.md`;
  const prereq =
    runStep === 2
      ? 'Phase 01 complete.'
      : prevManifest
        ? `Manifest \`${prevManifest}\` verified (\`verify-lint-phase -- ${prevManifest}\`).`
        : 'Prior step complete.';

  const content = `# Phase — ${manifestId}

## Prerequisites

${prereq}

## Outcome

All files in manifest **${manifestId}** have zero ESLint errors.

## Local agent session (Roo)

- **Start a new Roo task** for this manifest only — do not continue an old lint thread.
- Paste [HANDOFF-PROMPT.md](../HANDOFF-PROMPT.md) opener + this manifest id.
- Do **not** edit files outside [docs/manifests/${manifestId}.md](../docs/manifests/${manifestId}.md).

## File list

[docs/manifests/${manifestId}.md](../docs/manifests/${manifestId}.md)

## Procedure

1. Work files in manifest order (highest error count first).
2. Per file: [docs/lint-errors-line-level.md](../docs/lint-errors-line-level.md) + [docs/fix-playbooks.md](../docs/fix-playbooks.md).
3. \`npm run verify-handoff-path -- "<path>"\` on each touched \`.ts\` / \`.vue\` when possible.

## Verify

\`\`\`bash
npm run verify-lint-phase -- ${manifestId}
\`\`\`

Must exit **0** before marking **Done** + **Verified** in the tracker.
`;
  fs.writeFileSync(path.join(phasesDir, `${manifestId}.md`), content);

  rows.push({
    step: runStep,
    phase: phaseFile,
    files: stats.files,
    errors: stats.errors,
    manifest: `manifests/${manifestId}.md`,
  });
  prevManifest = manifestId;
  runStep += 1;
}

const finalStep = runStep;
const p14 = `# Phase 14 — Final verification

## Prerequisites

Every manifest in [docs/manifest-index.json](../docs/manifest-index.json) verified.

## Outcome

Full lint and CI gates green.

## Verify

\`\`\`bash
npm run lint
npm run lint:ci
npm run type-check:ci
npm run test
\`\`\`

## Tracker

Set status **executor-complete** in [IMPLEMENTATION-TRACKER.md](../IMPLEMENTATION-TRACKER.md) section B.
`;
fs.writeFileSync(path.join(phasesDir, '14-final-verification.md'), p14);

rows.push({
  step: finalStep,
  phase: 'phases/14-final-verification.md',
  files: '—',
  errors: '—',
  manifest: 'Full repo verify',
});

const planLines = [
  '# lab-lint-fixes — Implementation plan (agent-executable)',
  '',
  '**Scope:** [SCOPE.md](./SCOPE.md)',
  '**Fix guidance:** [docs/fix-playbooks.md](./docs/fix-playbooks.md)',
  '**Full error list:** [docs/lint-errors-line-level.md](./docs/lint-errors-line-level.md)',
  '**Tracker:** [IMPLEMENTATION-TRACKER.md](./IMPLEMENTATION-TRACKER.md)',
  '**Local sessions:** [docs/local-executor-efficiency.md](./docs/local-executor-efficiency.md) · [ROO-SESSION-PROMPT.md](./ROO-SESSION-PROMPT.md)',
  '**Pitfalls:** [PLAN-REVIEW.md](./PLAN-REVIEW.md)',
  '',
  '**Audience:** Local executor — **one Roo task per manifest** (sub-phase). Regenerate manifests after long merges:',
  '',
  '```bash',
  'node scripts/generate-lint-inventory.mjs',
  'node scripts/generate-lint-phase-manifests.mjs',
  'node scripts/generate-lint-phase-docs.mjs',
  '```',
  '',
  '## Execution order',
  '',
  '| Step | Phase | Files | Errors | Manifest |',
  '|------|-------|-------|--------|----------|',
  ...rows.map(
    (r) =>
      `| ${r.step} | [${r.phase}](./${r.phase}) | ${r.files} | ${r.errors} | ${r.manifest} |`,
  ),
  '',
  'Manifest list: [docs/manifest-index.json](./docs/manifest-index.json) (`order` array).',
  '',
  '## Definition of done',
  '',
  '- [ ] `npm run lint` — **0 errors** (full repo).',
  '- [ ] `npm run lint:ci` — still passes.',
  '- [ ] `npm run type-check:ci` — still passes.',
  '- [ ] `npm run test` — passes.',
  '- [ ] No new `eslint-disable` except documented in tracker **Plan gaps**.',
  '- [ ] Tracker section B complete; status `executor-complete`.',
  '',
];

fs.writeFileSync(path.join(planDir, 'IMPLEMENTATION-PLAN.md'), planLines.join('\n'));

// Tracker section B skeleton
const trackerRows = rows
  .filter((r) => r.step >= 2 && r.manifest.startsWith('manifests/'))
  .map(
    (r) =>
      `| ${r.step} | ${r.phase} | [ ] | [ ] | ≤${r.files} files · verify-lint-phase ${r.manifest.replace('manifests/', '').replace('.md', '')} |`,
  );

const trackerPath = path.join(planDir, 'IMPLEMENTATION-TRACKER.md');
let tracker = fs.readFileSync(trackerPath, 'utf8');
const start = tracker.indexOf('| Step | Phase doc | Done | Verified | Notes |');
const end = tracker.indexOf('### Executor — definition of done');
if (start !== -1 && end !== -1) {
  const header = tracker.slice(0, start);
  const tail = tracker.slice(end);
  const mid = [
    '| Step | Phase doc | Done | Verified | Notes |',
    '|------|-----------|------|----------|-------|',
    '| 0 | phases/00-agent-rules.md | [x] | [x] | Read complete |',
    '| 1 | phases/01-inventory-baseline.md | [x] | [ ] | Inventory only |',
    '| 2 | phases/02-scripts-vite.md | [x] | [x] | Legacy single manifest — complete |',
    ...trackerRows,
    `| ${finalStep} | phases/14-final-verification.md | [ ] | [ ] | |`,
    '',
  ].join('\n');
  tracker = header + mid + tail;
  fs.writeFileSync(trackerPath, tracker);
}

console.log('Wrote', order.length, 'phase files + IMPLEMENTATION-PLAN.md');
