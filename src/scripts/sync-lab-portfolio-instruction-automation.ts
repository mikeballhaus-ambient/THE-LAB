/**
 * rm-68.2 — UI automation instruction blocks for lab portfolio + platform apps.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CatalogHostRecordAutomationDoc } from '@/shared/constants/format-catalog-record-automation-instructions';
import type { PlatformRecordListAutomationDoc } from '@/shared/constants/format-catalog-record-automation-instructions';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'src/backend/db/Apps/app-instructions');

const IMPORT_CATALOG =
  "import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';\n";
const IMPORT_PLATFORM =
  "import { formatPlatformRecordListAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';\n";

type Entry =
  | { file: string; kind: 'catalog'; seed: CatalogHostRecordAutomationDoc; anchor: string }
  | { file: string; kind: 'platform'; seed: PlatformRecordListAutomationDoc; anchor: string };

const ENTRIES: Entry[] = [
  {
    file: 'task-list-app-instructions.ts',
    kind: 'catalog',
    anchor: '**Question: "Design or change task/list forms"**',
    seed: {
      appId: 'app-task-list',
      displayName: 'Task List',
      contextAreaClass: 'task-list-app',
      primaryRecordLabel: 'task title',
      extraBullets: [
        '**Task list** Edit/remove buttons (selected tab) use list id + list name in `data-lab-record-*`.',
        'Each **task row** uses the task title as `data-lab-record-name`.',
      ],
    },
  },
  {
    file: 'crm-app-instructions.ts',
    kind: 'catalog',
    anchor: '## Unique Class Names for Agent Identification',
    seed: {
      appId: 'app-lab-crm',
      displayName: 'CRM',
      contextAreaClass: 'crm-app',
      primaryRecordLabel: 'entity record',
      extraBullets: [
        'Entity grid **Edit** uses the first visible column value as `data-lab-record-name` (see `recordLabelFromRow`).',
        'Scope discovery to `crm-entity-records-view` when working a single entity list.',
      ],
    },
  },
  {
    file: 'help-desk-app-instructions.ts',
    kind: 'catalog',
    anchor: '## Unique Class Names for Agent Identification',
    seed: {
      appId: 'app-lab-helpdesk',
      displayName: 'Help Desk',
      contextAreaClass: 'help-desk-app',
      primaryRecordLabel: 'ticket subject',
      extraBullets: ['Ticket table **Edit** / **Remove** use ticket id + subject.'],
    },
  },
  {
    file: 'forms-builder-app-instructions.ts',
    kind: 'catalog',
    anchor: '## Component Hierarchy Diagram',
    seed: {
      appId: 'app-lab-formsbuilder',
      displayName: 'Forms Builder',
      contextAreaClass: 'forms-builder-app',
      primaryRecordLabel: 'form name',
      extraBullets: [
        'Form list edit/delete uses `formKey` as `data-lab-record-id` and form **name** as `data-lab-record-name`.',
        'Connector cards use connector id + **entity name** on edit/delete.',
      ],
    },
  },
  {
    file: 'chart-builder-app-instructions.ts',
    kind: 'catalog',
    anchor: '## Embedding',
    seed: {
      appId: 'app-lab-chartbuilder',
      displayName: 'Chart Builder',
      contextAreaClass: 'chart-builder-app',
      primaryRecordLabel: 'chart name',
      extraBullets: ['Charts table uses `chartKey` as record id and chart **name** for search.'],
    },
  },
  {
    file: 'job-applicant-tracker-app-instructions.ts',
    kind: 'catalog',
    anchor: 'User doc:',
    seed: {
      appId: 'app-job-applicant-tracker',
      displayName: 'Job Applicant Tracker',
      contextAreaClass: 'job-applicant-tracker-app',
      primaryRecordLabel: 'applicant name',
      extraBullets: ['Kanban cards expose edit/delete with applicant name.'],
    },
  },
  {
    file: 'lab-workflow-studio-app-instructions.ts',
    kind: 'platform',
    anchor: '## Agent checklist',
    seed: {
      contextArea: 'lab-workflow-studio-app',
      recordLabel: 'workflow',
      launchHint: 'Launch **Workflow Studio** from the catalog (`[data-appname="Workflow Studio"]`).',
    },
  },
  {
    file: 'lab-approvals-policies-app-instructions.ts',
    kind: 'platform',
    anchor: '## Agent checklist',
    seed: {
      contextArea: 'lab-approvals-policies-app',
      recordLabel: 'approval policy',
      launchHint: 'Launch **Approvals & Policies** or open **Policies (admin)** tab.',
    },
  },
  {
    file: 'lab-financial-ledger-app-instructions.ts',
    kind: 'platform',
    anchor: '## Agent checklist',
    seed: {
      contextArea: 'lab-financial-ledger-app',
      recordLabel: 'ledger account',
      launchHint: 'Launch **Financial Ledger** → **Accounts (admin)** for the accounts table.',
    },
  },
];

function formatCatalogSeed(seed: CatalogHostRecordAutomationDoc): string {
  const lines = ['{', `  appId: '${seed.appId}',`, `  displayName: '${seed.displayName}',`, `  contextAreaClass: '${seed.contextAreaClass}',`, `  primaryRecordLabel: '${seed.primaryRecordLabel}',`];
  if (seed.extraBullets?.length) {
    lines.push('  extraBullets: [');
    for (const b of seed.extraBullets) lines.push(`    ${JSON.stringify(b)},`);
    lines.push('  ],');
  }
  lines.push('}');
  return lines.join('\n');
}

function formatPlatformSeed(seed: PlatformRecordListAutomationDoc): string {
  return `{
  contextArea: '${seed.contextArea}',
  recordLabel: '${seed.recordLabel}',
  launchHint: ${JSON.stringify(seed.launchHint)},
}`;
}

for (const entry of ENTRIES) {
  const full = path.join(DIR, entry.file);
  let text = fs.readFileSync(full, 'utf8');
  const marker =
    entry.kind === 'catalog'
      ? 'formatCatalogHostRecordAutomationSection'
      : 'formatPlatformRecordListAutomationSection';
  if (text.includes(marker)) {
    console.log('skip', entry.file);
    continue;
  }

  const imp = entry.kind === 'catalog' ? IMPORT_CATALOG : IMPORT_PLATFORM;
  text = text.replace(/export const /, `${imp}\nexport const `);

  const injection =
    entry.kind === 'catalog'
      ? `\n\n\${formatCatalogHostRecordAutomationSection(${formatCatalogSeed(entry.seed)})}\n\n`
      : `\n\n\${formatPlatformRecordListAutomationSection(${formatPlatformSeed(entry.seed)})}\n\n`;

  if (!text.includes(entry.anchor)) {
    console.warn('anchor missing', entry.file, entry.anchor);
    continue;
  }
  text = text.replace(entry.anchor, `${injection}${entry.anchor}`);

  fs.writeFileSync(full, text);
  console.log('synced', entry.file);
}
