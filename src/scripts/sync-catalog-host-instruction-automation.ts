/**
 * rm-68.2 — inject formatCatalogHostRecordAutomationSection() into catalog host app instructions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG_HOST_RECORD_AUTOMATION_INSTRUCTION_SEEDS } from '@/shared/constants/catalog-host-record-automation-instruction-seeds';

const ROOT = process.cwd();
const INSTRUCTIONS_DIR = path.join(ROOT, 'src/backend/db/Apps/app-instructions');

const FILE_BY_APP_ID: Record<string, string> = {
  'app-polls-surveys': 'polls-surveys-app-instructions.ts',
  'app-expense-reports': 'expense-reports-app-instructions.ts',
  'app-suggestion-box': 'suggestion-box-app-instructions.ts',
  'app-event-rsvp': 'event-rsvp-app-instructions.ts',
  'app-onboarding-checklist': 'onboarding-checklist-app-instructions.ts',
  'app-project-charter': 'project-charter-app-instructions.ts',
  'app-rental-property': 'rental-property-app-instructions.ts',
  'app-weather-dashboard': 'weather-dashboard-app-instructions.ts',
  'app-training-quizzes': 'training-quizzes-app-instructions.ts',
  'app-okr-goals': 'okr-goals-app-instructions.ts',
  'app-travel-itinerary': 'travel-itinerary-app-instructions.ts',
  'app-home-maintenance': 'home-maintenance-app-instructions.ts',
  'app-time-tracking': 'time-tracking-app-instructions.ts',
  'app-knowledge-base': 'knowledge-base-app-instructions.ts',
};

function formatSeedObjectLiteral(seed: (typeof CATALOG_HOST_RECORD_AUTOMATION_INSTRUCTION_SEEDS)[number]): string {
  const lines = ['{', `  appId: '${seed.appId}',`, `  displayName: '${seed.displayName}',`, `  contextAreaClass: '${seed.contextAreaClass}',`, `  primaryRecordLabel: '${seed.primaryRecordLabel}',`];
  if (seed.extraBullets?.length) {
    lines.push(`  extraBullets: [`);
    for (const bullet of seed.extraBullets) {
      lines.push(`    ${JSON.stringify(bullet)},`);
    }
    lines.push(`  ],`);
  }
  lines.push('}');
  return lines.join('\n');
}

const IMPORT =
  "import { formatCatalogHostRecordAutomationSection } from '@/shared/constants/format-catalog-record-automation-instructions';\n";

for (const seed of CATALOG_HOST_RECORD_AUTOMATION_INSTRUCTION_SEEDS) {
  const fileName = FILE_BY_APP_ID[seed.appId];
  if (!fileName) {
    console.warn('no instruction file mapping for', seed.appId);
    continue;
  }
  const full = path.join(INSTRUCTIONS_DIR, fileName);
  let text = fs.readFileSync(full, 'utf8');

  const blockRe = /\$\{formatCatalogHostRecordAutomationSection\([\s\S]*?\)\}/;
  if (blockRe.test(text)) {
    text = text.replace(blockRe, `\${formatCatalogHostRecordAutomationSection(${formatSeedObjectLiteral(seed)})}`);
    fs.writeFileSync(full, text);
    console.log('refreshed', fileName);
    continue;
  }

  if (!text.includes(IMPORT.trim())) {
    text = text.replace(/export const /, `${IMPORT}\nexport const `);
  }

  const injection = `\n\n\${formatCatalogHostRecordAutomationSection(${formatSeedObjectLiteral(seed)})}\n\n`;
  if (!text.includes('\n\nUser doc:')) {
    console.warn('no User doc anchor', fileName);
    continue;
  }
  text = text.replace(/\n\nUser doc:/, `${injection}User doc:`);

  fs.writeFileSync(full, text);
  console.log('synced', fileName);
}
