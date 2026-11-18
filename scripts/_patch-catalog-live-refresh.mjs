import fs from 'node:fs';

const apps = [
  ['src/apps/time-tracking/front-end/App.vue', 'refresh()'],
  ['src/apps/expense-reports/front-end/App.vue', 'refresh({ bumpCharts: true })'],
  ['src/apps/suggestion-box/front-end/App.vue', 'refresh({ bumpCharts: true })'],
  ['src/apps/project-charter/front-end/App.vue', 'refresh()'],
  ['src/apps/travel-itinerary/front-end/App.vue', 'refresh()'],
  ['src/apps/knowledge-base/front-end/App.vue', 'refresh()'],
  ['src/apps/weather-dashboard/front-end/App.vue', 'refresh()'],
  ['src/apps/training-quizzes/front-end/App.vue', 'refresh()'],
  ['src/apps/polls-surveys/front-end/App.vue', 'refresh()'],
  ['src/apps/onboarding-checklist/front-end/App.vue', 'refresh()'],
  ['src/apps/home-maintenance/front-end/App.vue', 'refresh()'],
  ['src/apps/event-rsvp/front-end/App.vue', 'refresh()'],
  ['src/apps/rental-property/front-end/App.vue', 'refresh()'],
  ['src/apps/job-applicant-tracker/front-end/App.vue', 'refresh()'],
  ['src/apps/okr-goals/front-end/App.vue', 'refresh()'],
];

const importLine =
  "import { useCatalogHostLiveRefresh } from '@/shared/composables/catalog/useCatalogHostLiveRefresh';";

for (const [file, refreshCall] of apps) {
  let t = fs.readFileSync(file, 'utf8');
  if (t.includes('useCatalogHostLiveRefresh')) {
    console.log('skip', file);
    continue;
  }
  if (!t.includes(importLine)) {
    t = t.replace(
      "import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';",
      `${importLine}\nimport { useUniqueElementId } from '@/shared/composables/useUniqueElementId';`,
    );
  }
  const block = `
useCatalogHostLiveRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  onRefresh: () => ${refreshCall},
});
`;
  const marker = 'const base = computed';
  const idx = t.indexOf(marker);
  if (idx < 0) {
    console.log('no base', file);
    continue;
  }
  const close = t.indexOf(');', idx);
  const lineEnd = t.indexOf('\n', close);
  t = t.slice(0, lineEnd + 1) + block + t.slice(lineEnd + 1);
  fs.writeFileSync(file, t);
  console.log('patched', file);
}
