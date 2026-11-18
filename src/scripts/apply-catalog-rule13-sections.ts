/**
 * Apply rule-13 CatalogAppReportsSection + CatalogAppFormSection to Wave C hosts.
 * Run: npx tsx src/scripts/apply-catalog-rule13-sections.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

type AppPatch = {
  appId: string;
  rootClass: string;
  reportsIdPrefix: string;
  workspace: {
    idPrefix: string;
    title: string;
    lead: string;
    icon: string;
    mainClass?: string;
  };
};

const APPS: AppPatch[] = [
  {
    appId: 'okr-goals',
    rootClass: 'okr-goals-app',
    reportsIdPrefix: 'okr-reports',
    workspace: {
      idPrefix: 'okr-main',
      title: 'Objectives',
      lead: 'Quarterly goals, key results, and inline progress updates.',
      icon: 'pi pi-bullseye',
    },
  },
  {
    appId: 'travel-itinerary',
    rootClass: 'travel-itinerary-app',
    reportsIdPrefix: 'travel-reports',
    workspace: {
      idPrefix: 'travel-main',
      title: 'Trips',
      lead: 'Trips and itinerary items from the demo catalog.',
      icon: 'pi pi-map',
    },
  },
  {
    appId: 'project-charter',
    rootClass: 'project-charter-app',
    reportsIdPrefix: 'charter-reports',
    workspace: {
      idPrefix: 'charter-main',
      title: 'Charters',
      lead: 'Draft and active project charters.',
      icon: 'pi pi-file-edit',
    },
  },
  {
    appId: 'time-tracking',
    rootClass: 'time-tracking-app',
    reportsIdPrefix: 'time-reports',
    workspace: {
      idPrefix: 'time-main',
      title: 'Time log',
      lead: 'Logged hours and weekly submit.',
      icon: 'pi pi-clock',
      mainClass: 'catalog-app-workspace-section lab-app-body flex-1 min-h-0 flex flex-col lg:flex-row gap-4',
    },
  },
  {
    appId: 'job-applicant-tracker',
    rootClass: 'job-applicant-tracker-app',
    reportsIdPrefix: 'applicant-reports',
    workspace: {
      idPrefix: 'applicant-main',
      title: 'Hiring pipeline',
      lead: 'Kanban by stage; move applicants inline.',
      icon: 'pi pi-users',
    },
  },
  {
    appId: 'suggestion-box',
    rootClass: 'suggestion-box-app',
    reportsIdPrefix: 'suggestion-reports',
    workspace: {
      idPrefix: 'suggestion-main',
      title: 'Suggestions',
      lead: 'Votes and promotion workflow.',
      icon: 'pi pi-comments',
    },
  },
  {
    appId: 'expense-reports',
    rootClass: 'expense-reports-app',
    reportsIdPrefix: 'expense-reports',
    workspace: {
      idPrefix: 'expense-main',
      title: 'Expenses',
      lead: 'Status totals and reimbursement demo rows.',
      icon: 'pi pi-wallet',
    },
  },
  {
    appId: 'training-quizzes',
    rootClass: 'training-quizzes-app',
    reportsIdPrefix: 'quiz-reports',
    workspace: {
      idPrefix: 'quiz-main',
      title: 'Quizzes',
      lead: 'Author questions, certifications, and take attempts.',
      icon: 'pi pi-question-circle',
      mainClass: 'catalog-app-workspace-section lab-app-body flex-1 min-h-0 flex flex-row gap-4',
    },
  },
  {
    appId: 'onboarding-checklist',
    rootClass: 'onboarding-checklist-app',
    reportsIdPrefix: 'onboarding-reports',
    workspace: {
      idPrefix: 'onboarding-main',
      title: 'Checklists',
      lead: 'Onboarding tasks per new hire.',
      icon: 'pi pi-check-square',
    },
  },
  {
    appId: 'rental-property',
    rootClass: 'rental-property-app',
    reportsIdPrefix: 'rental-reports',
    workspace: {
      idPrefix: 'rental-main',
      title: 'Properties',
      lead: 'Leases and rent payment status.',
      icon: 'pi pi-home',
    },
  },
  {
    appId: 'home-maintenance',
    rootClass: 'home-maintenance-app',
    reportsIdPrefix: 'home-reports',
    workspace: {
      idPrefix: 'home-main',
      title: 'Assets & tasks',
      lead: 'Maintenance assets and open tasks.',
      icon: 'pi pi-wrench',
    },
  },
  {
    appId: 'event-rsvp',
    rootClass: 'event-rsvp-app',
    reportsIdPrefix: 'rsvp-reports',
    workspace: {
      idPrefix: 'rsvp-main',
      title: 'Events',
      lead: 'RSVP responses per event.',
      icon: 'pi pi-calendar',
    },
  },
  {
    appId: 'polls-surveys',
    rootClass: 'polls-surveys-app',
    reportsIdPrefix: 'polls-reports',
    workspace: {
      idPrefix: 'polls-main',
      title: 'Polls',
      lead: 'Options, votes, and poll status.',
      icon: 'pi pi-chart-pie',
    },
  },
];

function replaceLabReportsSection(src: string, reportsIdPrefix: string): string {
  const marker = 'class="lab-reports-section';
  const idx = src.indexOf(marker);
  if (idx === -1) {
    return src;
  }
  const sectionStart = src.lastIndexOf('<section', idx);
  const sectionEnd = src.indexOf('</section>', idx);
  if (sectionStart === -1 || sectionEnd === -1) {
    return src;
  }
  const end = sectionEnd + '</section>'.length;
  const replacement = `    <CatalogAppReportsSection
      :host-app-id="HOST_APP_ID"
      :server-url="props.serverUrl"
      id-prefix="${reportsIdPrefix}"
    />
`;
  return src.slice(0, sectionStart) + replacement + src.slice(end);
}

function replaceMainWithFormSection(src: string, app: AppPatch): string {
  if (src.includes('<CatalogAppFormSection')) {
    return src;
  }
  const mainMatch = src.match(
    /<main class="lab-app-body[^"]*" :id="generateUniqueId\('([^']+)'\)">/,
  );
  if (!mainMatch) {
    return src;
  }
  const mainClass =
    app.workspace.mainClass ??
    'catalog-app-workspace-section lab-app-body flex-1 min-h-0 flex flex-col gap-4';
  const open = `<CatalogAppFormSection
      title="${app.workspace.title}"
      lead="${app.workspace.lead}"
      icon="${app.workspace.icon}"
      section-class="${mainClass}"
      id-prefix="${app.workspace.idPrefix}"
    >`;
  src = src.replace(mainMatch[0], open);
  return src.replace('\n    </main>\n', '\n    </CatalogAppFormSection>\n');
}

function patchApp(app: AppPatch): void {
  const filePath = path.join(ROOT, 'src/apps', app.appId, 'front-end/App.vue');
  let src = fs.readFileSync(filePath, 'utf8');

  src = src.replace(
    /import \{ CatalogIntegrationHost, CatalogReportsPanel \} from '@\/shared\/integration';/,
    "import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';",
  );
  src = src.replace(
    /import \{ CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost \} from '@\/shared\/integration';/,
    "import { CatalogAppFormSection, CatalogAppReportsSection, CatalogIntegrationHost } from '@/shared/integration';",
  );

  if (!src.includes('lab-platform-catalog-app')) {
    src = src.replace(
      `class="${app.rootClass} app-loaded-container`,
      `class="${app.rootClass} lab-platform-catalog-app app-loaded-container`,
    );
  }

  src = replaceLabReportsSection(src, app.reportsIdPrefix);
  src = replaceMainWithFormSection(src, app);

  fs.writeFileSync(filePath, src, 'utf8');
  console.log(`patched ${app.appId}`);
}

for (const app of APPS) {
  patchApp(app);
}

console.log('done');
