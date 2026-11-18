/**
 * Canonical app-id → demo pack descriptors for the 15 Wave C catalog apps.
 *
 * One list feeds three consumers so they can never drift:
 * 1. `app-seed-data-registry.ts` (Settings UI manifests)
 * 2. `app-seed-data-direct.ts` (apply/remove against the on-disk app DB)
 * 3. per-app `seed-*-demo.ts` modules (pack id + boot-flag key constants)
 *
 * Kept in `src/shared` and free of app imports — the backend wires the actual seed
 * implementation per app id.
 *
 * **Dependency direction:** this module is a leaf. `app-seed-boot-flags.ts` imports it
 * (not the other way round) so the boot-flag key table and the pack table cannot drift.
 */

/** Boot-suppression keys for the 15 catalog demo packs (stored in each app DB `configs`). */
export const CATALOG_DEMO_BOOT_FLAG_KEYS = {
  OKR_GOALS_DEMO: 'okr_goals_demo_seed_disabled',
  TRAVEL_ITINERARY_DEMO: 'travel_itinerary_demo_seed_disabled',
  PROJECT_CHARTER_DEMO: 'project_charter_demo_seed_disabled',
  TIME_TRACKING_DEMO: 'time_tracking_demo_seed_disabled',
  JOB_APPLICANT_TRACKER_DEMO: 'job_applicant_tracker_demo_seed_disabled',
  SUGGESTION_BOX_DEMO: 'suggestion_box_demo_seed_disabled',
  EXPENSE_REPORTS_DEMO: 'expense_reports_demo_seed_disabled',
  KNOWLEDGE_BASE_DEMO: 'knowledge_base_demo_seed_disabled',
  TRAINING_QUIZZES_DEMO: 'training_quizzes_demo_seed_disabled',
  ONBOARDING_CHECKLIST_DEMO: 'onboarding_checklist_demo_seed_disabled',
  WEATHER_DASHBOARD_DEMO: 'weather_dashboard_demo_seed_disabled',
  HOME_MAINTENANCE_DEMO: 'home_maintenance_demo_seed_disabled',
  RENTAL_PROPERTY_DEMO: 'rental_property_demo_seed_disabled',
  EVENT_RSVP_DEMO: 'event_rsvp_demo_seed_disabled',
  POLLS_SURVEYS_DEMO: 'polls_surveys_demo_seed_disabled',
  /** §30.8 documentation hub — real docs, not the removable demo pack. */
  KNOWLEDGE_BASE_DOCS: 'knowledge_base_docs_seed_disabled',
} as const;

export interface CatalogDemoSeedPack {
  /** THE-LAB registry app id. */
  appId: string;
  /** Settings pack id (persisted in app DB `configs` boot flags). */
  packId: string;
  label: string;
  description: string;
  /** Boot-suppression key for this pack. */
  bootFlagKey: string;
}

export const CATALOG_DEMO_SEED_PACKS: readonly CatalogDemoSeedPack[] = [
  {
    appId: 'app-okr-goals',
    packId: 'okr-goals-demo',
    label: 'OKR demo objectives',
    description: 'Three objectives with eight key results across the demo cast.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.OKR_GOALS_DEMO,
  },
  {
    appId: 'app-travel-itinerary',
    packId: 'travel-demo',
    label: 'Travel demo itineraries',
    description: 'Two trips with flights, hotels and activities.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.TRAVEL_ITINERARY_DEMO,
  },
  {
    appId: 'app-project-charter',
    packId: 'charter-demo',
    label: 'Project charter demo records',
    description: 'Two charters with sponsors, stakeholders and goals.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.PROJECT_CHARTER_DEMO,
  },
  {
    appId: 'app-time-tracking',
    packId: 'time-tracking-demo',
    label: 'Time tracking demo entries',
    description: 'Twelve entries across two projects for the current and prior week.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.TIME_TRACKING_DEMO,
  },
  {
    appId: 'app-job-applicant-tracker',
    packId: 'applicant-demo',
    label: 'Job applicant demo pipeline',
    description: 'Six external candidates spread across every hiring stage.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.JOB_APPLICANT_TRACKER_DEMO,
  },
  {
    appId: 'app-suggestion-box',
    packId: 'suggestion-demo',
    label: 'Suggestion box demo ideas',
    description: 'Five suggestions spanning every status with vote counts.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.SUGGESTION_BOX_DEMO,
  },
  {
    appId: 'app-expense-reports',
    packId: 'expense-demo',
    label: 'Expense report demo data',
    description: 'Eight expenses covering every approval status (Lab Approvals demo rows). Resets on revision bump or Settings Apply.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.EXPENSE_REPORTS_DEMO,
  },
  {
    appId: 'app-knowledge-base',
    packId: 'kb-demo',
    label: 'Knowledge base demo articles',
    description: 'Six illustrative articles used by catalog dashboards and reports.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.KNOWLEDGE_BASE_DEMO,
  },
  {
    appId: 'app-training-quizzes',
    packId: 'quiz-demo',
    label: 'Training demo quizzes',
    description: 'Three quizzes with nine questions and five scored attempts.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.TRAINING_QUIZZES_DEMO,
  },
  {
    appId: 'app-onboarding-checklist',
    packId: 'onboarding-demo',
    label: 'Onboarding demo checklists',
    description: 'Three checklists with twelve tasks in mixed states.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.ONBOARDING_CHECKLIST_DEMO,
  },
  {
    appId: 'app-weather-dashboard',
    packId: 'weather-demo',
    label: 'Weather demo locations',
    description: 'Three saved locations with nine observations across every condition.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.WEATHER_DASHBOARD_DEMO,
  },
  {
    appId: 'app-home-maintenance',
    packId: 'home-demo',
    label: 'Home maintenance demo assets',
    description: 'Four home assets with ten scheduled and completed tasks.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.HOME_MAINTENANCE_DEMO,
  },
  {
    appId: 'app-rental-property',
    packId: 'rental-demo',
    label: 'Rental property demo portfolio',
    description: 'Four properties, four leases and ten rent payments with external tenants. Resets on revision bump or Settings Apply.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.RENTAL_PROPERTY_DEMO,
  },
  {
    appId: 'app-event-rsvp',
    packId: 'rsvp-demo',
    label: 'Event RSVP demo events',
    description: 'Three events with twelve guest responses from the demo cast.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.EVENT_RSVP_DEMO,
  },
  {
    appId: 'app-polls-surveys',
    packId: 'polls-demo',
    label: 'Polls & surveys demo polls',
    description: 'Three polls with twelve options and thirteen cast votes; open poll listed first with four choices. Resets on revision bump or Settings Apply.',
    bootFlagKey: CATALOG_DEMO_BOOT_FLAG_KEYS.POLLS_SURVEYS_DEMO,
  },
] as const;

/** Display names for Settings → App demo data (matches the app registry names). */
export const APP_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  'app-okr-goals': 'Okr goals',
  'app-travel-itinerary': 'Travel itinerary',
  'app-project-charter': 'Project charter',
  'app-time-tracking': 'Time tracking',
  'app-job-applicant-tracker': 'Job applicant tracker',
  'app-suggestion-box': 'Suggestion box',
  'app-expense-reports': 'Expense reports',
  'app-knowledge-base': 'Knowledge base',
  'app-training-quizzes': 'Training quizzes',
  'app-onboarding-checklist': 'Onboarding checklist',
  'app-weather-dashboard': 'Weather dashboard',
  'app-home-maintenance': 'Home maintenance',
  'app-rental-property': 'Rental property',
  'app-event-rsvp': 'Event rsvp',
  'app-polls-surveys': 'Polls surveys',
};

const PACK_BY_APP_ID = new Map(CATALOG_DEMO_SEED_PACKS.map((pack) => [pack.appId, pack]));

/** Demo pack descriptor for a catalog app id, or `undefined` when the app has no demo pack. */
export function catalogDemoSeedPackFor(appId: string): CatalogDemoSeedPack | undefined {
  return PACK_BY_APP_ID.get(appId);
}

/** All catalog app ids that own a demo seed pack. */
export const CATALOG_DEMO_APP_IDS: readonly string[] = CATALOG_DEMO_SEED_PACKS.map(
  (pack) => pack.appId,
);

/** Pack id for a catalog app id, or `undefined`. */
export function catalogDemoPackIdFor(appId: string): string | undefined {
  return PACK_BY_APP_ID.get(appId)?.packId;
}
