/**
 * Additive registry insert for the Wave C catalog apps (rm-64 phases 21–24).
 *
 * **Why this exists.** These 14 apps were built, wrapped in an integration host, given demo
 * seeds, and given `app_system_instructions` — but nothing ever inserted their `apps` rows.
 * `resolveAppDatabaseFolderId('app-okr-goals')` returned `null`, `urlForApp` returned `null`,
 * and `syncSeededAppSystemInstructions()` ran `UPDATE ... WHERE id = 'app-okr-goals'` against
 * a row that did not exist, matching zero rows silently.
 *
 * **Safety.** Additive and idempotent, exactly like `register-game-apps-once.ts`: an existing
 * row is reported and skipped, never modified or deleted. This script performs **no filesystem
 * operations** — it cannot delete an app directory. (See `sync-app-dirs.ts` history: a
 * pre-bootstrap script used to delete `src/apps/*` folders missing from the registry, which is
 * how these apps were lost in the first place.)
 *
 * Usage:
 *   npx tsx src/scripts/register-catalog-apps-once.ts                 # all
 *   npx tsx src/scripts/register-catalog-apps-once.ts app-okr-goals   # one
 */
import { databaseManager } from '@/backend/db/DatabaseManager';
import { appsService } from '@/backend/db/Apps/apps-service';
import { ensureCatalogTagsAndLinkApp } from '@/backend/db/AppTags/ensure-catalog-tags-for-app';
import { okrGoalsAppInstructions } from '@/backend/db/Apps/app-instructions/okr-goals-app-instructions';
import { travelItineraryAppInstructions } from '@/backend/db/Apps/app-instructions/travel-itinerary-app-instructions';
import { projectCharterAppInstructions } from '@/backend/db/Apps/app-instructions/project-charter-app-instructions';
import { timeTrackingAppInstructions } from '@/backend/db/Apps/app-instructions/time-tracking-app-instructions';
import { jobApplicantTrackerAppInstructions } from '@/backend/db/Apps/app-instructions/job-applicant-tracker-app-instructions';
import { suggestionBoxAppInstructions } from '@/backend/db/Apps/app-instructions/suggestion-box-app-instructions';
import { expenseReportsAppInstructions } from '@/backend/db/Apps/app-instructions/expense-reports-app-instructions';
import { trainingQuizzesAppInstructions } from '@/backend/db/Apps/app-instructions/training-quizzes-app-instructions';
import { onboardingChecklistAppInstructions } from '@/backend/db/Apps/app-instructions/onboarding-checklist-app-instructions';
import { weatherDashboardAppInstructions } from '@/backend/db/Apps/app-instructions/weather-dashboard-app-instructions';
import { homeMaintenanceAppInstructions } from '@/backend/db/Apps/app-instructions/home-maintenance-app-instructions';
import { rentalPropertyAppInstructions } from '@/backend/db/Apps/app-instructions/rental-property-app-instructions';
import { eventRsvpAppInstructions } from '@/backend/db/Apps/app-instructions/event-rsvp-app-instructions';
import { pollsSurveysAppInstructions } from '@/backend/db/Apps/app-instructions/polls-surveys-app-instructions';
import type { IApp } from '@/shared/types/app/app.d';
import { AppDatabaseService } from '@/backend/AppDatabaseService';

interface CatalogAppSpec {
  id: string;
  /** Folder under `src/apps/`; also the AppDatabaseService host id. */
  slug: string;
  name: string;
  description: string;
  order: number;
  faIcon: string;
  /** Catalogue ports 4110–4124, as documented in each app's own instructions. */
  port: number;
  instructions: string;
  /** Platform catalog tag id — one of `platform_app_tags` (productivity, learning, …). */
  tag: string;
}

/**
 * Order continues the catalogue sequence after the games (21–29).
 * Ports are the ones each app already documents in its `app_system_instructions`.
 */
const CATALOG_APPS: CatalogAppSpec[] = [
  {
    id: 'app-okr-goals',
    slug: 'okr-goals',
    name: 'OKR / Goals',
    description: 'Objectives and key results with derived progress.',
    order: 30,
    faIcon: 'fa-bullseye',
    port: 4110,
    instructions: okrGoalsAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-travel-itinerary',
    slug: 'travel-itinerary',
    name: 'Travel Itinerary',
    description: 'Trips and their itinerary items.',
    order: 31,
    faIcon: 'fa-plane',
    port: 4111,
    instructions: travelItineraryAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-project-charter',
    slug: 'project-charter',
    name: 'Project Charter',
    description: 'Project charters: scope, stakeholders and goals.',
    order: 32,
    faIcon: 'fa-scroll',
    port: 4112,
    instructions: projectCharterAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-time-tracking',
    slug: 'time-tracking',
    name: 'Time Tracking',
    description: 'Log time against projects with weekly summaries.',
    order: 33,
    faIcon: 'fa-clock',
    port: 4113,
    instructions: timeTrackingAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-job-applicant-tracker',
    slug: 'job-applicant-tracker',
    name: 'Job Applicant Tracker',
    description: 'Candidate pipeline from applied to hired.',
    order: 34,
    faIcon: 'fa-user-tie',
    port: 4114,
    instructions: jobApplicantTrackerAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-suggestion-box',
    slug: 'suggestion-box',
    name: 'Suggestion Box',
    description: 'Collect ideas, track status and count votes.',
    order: 35,
    faIcon: 'fa-lightbulb',
    port: 4115,
    instructions: suggestionBoxAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-expense-reports',
    slug: 'expense-reports',
    name: 'Expense Reports',
    description: 'Submit and track expenses through reimbursement.',
    order: 36,
    faIcon: 'fa-receipt',
    port: 4116,
    instructions: expenseReportsAppInstructions,
    tag: 'productivity',
  },
  {
    id: 'app-training-quizzes',
    slug: 'training-quizzes',
    name: 'Training & Quizzes',
    description: 'Quizzes with questions and scored attempts.',
    order: 37,
    faIcon: 'fa-graduation-cap',
    port: 4118,
    instructions: trainingQuizzesAppInstructions,
    tag: 'learning',
  },
  {
    id: 'app-onboarding-checklist',
    slug: 'onboarding-checklist',
    name: 'Onboarding Checklist',
    description: 'Per-hire onboarding checklists with task progress.',
    order: 38,
    faIcon: 'fa-list-check',
    port: 4119,
    instructions: onboardingChecklistAppInstructions,
    tag: 'learning',
  },
  {
    id: 'app-weather-dashboard',
    slug: 'weather-dashboard',
    name: 'Weather Dashboard',
    description: 'Live conditions, radar, and forecasts for your saved locations.',
    order: 39,
    faIcon: 'fa-cloud-sun',
    port: 4120,
    instructions: weatherDashboardAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-home-maintenance',
    slug: 'home-maintenance',
    name: 'Home Maintenance',
    description: 'Household assets and their maintenance tasks.',
    order: 40,
    faIcon: 'fa-house-chimney',
    port: 4121,
    instructions: homeMaintenanceAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-rental-property',
    slug: 'rental-property',
    name: 'Rental Property',
    description: 'Properties, leases and rent payments.',
    order: 41,
    faIcon: 'fa-building',
    port: 4122,
    instructions: rentalPropertyAppInstructions,
    tag: 'utilities',
  },
  {
    id: 'app-event-rsvp',
    slug: 'event-rsvp',
    name: 'Event RSVP',
    description: 'Events and guest responses with headcounts.',
    order: 42,
    faIcon: 'fa-calendar-check',
    port: 4123,
    instructions: eventRsvpAppInstructions,
    tag: 'creative',
  },
  {
    id: 'app-polls-surveys',
    slug: 'polls-surveys',
    name: 'Polls & Surveys',
    description: 'Polls with options and votes, single or multi choice.',
    order: 43,
    faIcon: 'fa-square-poll-vertical',
    port: 4124,
    instructions: pollsSurveysAppInstructions,
    tag: 'creative',
  },
];

function toApp(spec: CatalogAppSpec): IApp {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    type: 'hybrid',
    componentPath: `/src/apps/${spec.slug}/front-end/App.vue`,
    isServerSideEnabled: true,
    isEnabled: true,
    order: spec.order,
    faIcon: spec.faIcon,
    server: {
      entry: `/src/apps/${spec.slug}/back-end/entry.ts`,
      port: spec.port,
      env: { NODE_ENV: 'development' },
    },
    requiresPort: spec.port,
    dependencies: [],
    optionalDependencies: [],
    version: '1.0.0',
    latestVersion: '1.0.0',
    isUpdateAvailable: false,
    changelog: [],
    isSystem: false,
    appSystemInstructions: spec.instructions,
  } as IApp;
}

async function main(): Promise<void> {
  const only = process.argv[2];
  await databaseManager.initialize();

  const targets = only ? CATALOG_APPS.filter((spec) => spec.id === only) : CATALOG_APPS;
  if (targets.length === 0) {
    console.error(`No catalog app matches "${only}".`);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const spec of targets) {
    if (appsService.getAppById(spec.id)) {
      console.log(`skip    ${spec.id} (already registered)`);
      skipped += 1;
      continue;
    }
    appsService.createApp(toApp(spec));
    await AppDatabaseService.getInstance(spec.slug);
    ensureCatalogTagsAndLinkApp(spec.id, [{ id: spec.tag }]);
    console.log(`created ${spec.id}  (port ${spec.port})`);
    created += 1;
  }

  console.log(`\ncreated=${created} skipped=${skipped} total=${targets.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
