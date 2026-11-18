import fs from 'fs';
import path from 'path';

const apps = [
  ['okr-goals', 'OKR'],
  ['travel-itinerary', 'Travel'],
  ['project-charter', 'Charter'],
  ['time-tracking', 'Time'],
  ['job-applicant-tracker', 'Applicant'],
  ['suggestion-box', 'Suggestion'],
  ['expense-reports', 'Expense'],
  ['training-quizzes', 'Quiz'],
  ['onboarding-checklist', 'Onboarding'],
  ['weather-dashboard', 'Weather'],
  ['home-maintenance', 'Home'],
  ['rental-property', 'Rental'],
  ['event-rsvp', 'RSVP'],
  ['polls-surveys', 'Polls'],
];

const block =
  /async function request<T>\(base: string, path: string, init\?: RequestInit\): Promise<T> \{[\s\S]*?return \(await res\.json\(\)\) as T;\s*\}\s*\n/;

for (const [slug, label] of apps) {
  const file = path.join('src/apps', slug, 'front-end/api.ts');
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('catalogAppRequest')) {
    console.log('skip', file);
    continue;
  }
  if (!block.test(src)) {
    console.error('no block', file);
    continue;
  }
  src = src.replace(
    block,
    `import { catalogAppRequest } from '@/shared/apps/catalog-app-request';\n\nasync function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {\n  return catalogAppRequest<T>(base, path, '${label}', init);\n}\n\n`,
  );
  // If import ended up inside another import block, fix duplicate import line at top
  const lines = src.split('\n');
  const importLines = lines.filter((l) => l.includes("catalogAppRequest"));
  if (importLines.length > 1) {
    src = lines
      .filter((l) => !l.includes("catalogAppRequest") || l === importLines[0])
      .join('\n');
    if (!src.includes("catalogAppRequest")) {
      const firstImportEnd = src.indexOf('\n\n');
      src =
        "import { catalogAppRequest } from '@/shared/apps/catalog-app-request';\n" +
        src.slice(firstImportEnd + 1);
    }
  }
  fs.writeFileSync(file, src);
  console.log('updated', file);
}
