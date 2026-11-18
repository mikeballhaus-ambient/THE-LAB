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

const emptyFn =
  /async function request<T>\(base: string, path: string, init\?: RequestInit\): Promise<T> \{\s*\}/;

for (const [slug, label] of apps) {
  const file = path.join('src/apps', slug, 'front-end/api.ts');
  let src = fs.readFileSync(file, 'utf8');
  if (!emptyFn.test(src)) {
    console.log('ok or manual', file);
    continue;
  }
  src = src.replace(
    emptyFn,
    `async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {\n  return catalogAppRequest<T>(base, path, '${label}', init);\n}`,
  );
  fs.writeFileSync(file, src);
  console.log('fixed', file);
}
