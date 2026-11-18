/**
 * One-off: wire useCatalogWorkspaceRefresh + chart-context on catalog apps with reports.
 * Run: npx tsx src/scripts/patch-catalog-chart-live-refresh.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP_IDS = [
  'home-maintenance',
  'onboarding-checklist',
  'event-rsvp',
  'okr-goals',
  'polls-surveys',
  'training-quizzes',
  'travel-itinerary',
  'job-applicant-tracker',
  'project-charter',
  'suggestion-box',
  'expense-reports',
  'time-tracking',
];

function patchApp(appId: string): boolean {
  const filePath = path.join(ROOT, 'src/apps', appId, 'front-end/App.vue');
  if (!fs.existsSync(filePath)) {
    return false;
  }
  let s = fs.readFileSync(filePath, 'utf8');
  if (!s.includes('CatalogAppReportsSection')) {
    return false;
  }
  if (s.includes('useCatalogWorkspaceRefresh')) {
    console.log('already ok', appId);
    return true;
  }

  s = s.replace(
    "import { useCatalogHostLiveRefresh } from '@/shared/composables/catalog/useCatalogHostLiveRefresh';",
    "import { useCatalogWorkspaceRefresh } from '@/shared/composables/catalog/useCatalogWorkspaceRefresh';",
  );

  s = s.replace(
    /useCatalogHostLiveRefresh\(\{\s*hostAppId: HOST_APP_ID,\s*serverUrl: \(\) => base\.value,\s*onRefresh: \(\) => refresh\(\{ bumpCharts: true \}\),\s*\}\);\s*/g,
    '',
  );
  s = s.replace(
    /useCatalogHostLiveRefresh\(\{\s*hostAppId: HOST_APP_ID,\s*serverUrl: \(\) => base\.value,\s*onRefresh: \(\) => refresh\(\),\s*\}\);\s*/g,
    '',
  );

  s = s.replace(
    /\/\*\* Bumped after[\s\S]*?\*\/\s*const chartDataRevision = ref\(0\);\s*/g,
    '',
  );
  s = s.replace(
    /const chartDataRevision = ref\(0\);\s*\n\s*const reportsChartContext = computed\(\(\) => \(\{\s*dataRevision: chartDataRevision\.value,\s*\}\)\);\s*/g,
    '',
  );

  const insertBlock = `
const { reportsChartContext, reloadWorkspace } = useCatalogWorkspaceRefresh({
  hostAppId: HOST_APP_ID,
  serverUrl: () => base.value,
  reload: refresh,
});
`;

  const refreshEndRe =
    /(\nasync function refresh\([^)]*\)[^{]*\{[\s\S]*?\n\})\n(\n(async function|function msg|function money|function status|const statuses|onMounted))/;
  if (!s.includes('useCatalogWorkspaceRefresh({') && refreshEndRe.test(s)) {
    s = s.replace(refreshEndRe, `$1${insertBlock}$2`);
  } else if (!s.includes('useCatalogWorkspaceRefresh({')) {
    console.error('failed to insert workspace refresh', appId);
    return false;
  }

  s = s.replace(/await refresh\(\{ bumpCharts: true \}\)/g, 'await reloadWorkspace()');
  s = s.replace(
    /async function onIntegrationSuccess\(\)[^{]*\{[\s\S]*?await refresh\(\)/g,
    (block) => block.replace('await refresh()', 'await reloadWorkspace()'),
  );

  // Other mutation helpers that only refresh()
  s = s.replace(/await refresh\(\);\s*\n(\s*)(toast\.add|await api)/g, (m, sp, next) => {
    if (m.includes('reloadWorkspace')) {
      return m;
    }
    return `await reloadWorkspace();\n${sp}${next}`;
  });

  if (s.includes('if (options?.bumpCharts)')) {
    s = s.replace(/if \(options\?\.bumpCharts\) \{\s*chartDataRevision\.value \+= 1;\s*\}\s*/g, '');
    s = s.replace(/async function refresh\(options\?: \{ bumpCharts\?: boolean \}\)/g, 'async function refresh()');
  }

  if (!s.includes(':chart-context="reportsChartContext"')) {
    s = s.replace(
      /<CatalogAppReportsSection(\s[\s\S]*?)(\/>|><\/CatalogAppReportsSection>)/g,
      (block) => {
        if (block.includes('chart-context')) {
          return block;
        }
        return block.replace(
          /(\s:id-prefix="[^"]+"\s*)/,
          '$1:chart-context="reportsChartContext"\n      ',
        );
      },
    );
  }

  s = s.replace(/@click="refresh"/g, '@click="reloadWorkspace"');

  fs.writeFileSync(filePath, s);
  console.log('patched', appId);
  return true;
}

for (const appId of APP_IDS) {
  patchApp(appId);
}
