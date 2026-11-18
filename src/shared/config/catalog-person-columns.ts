import type { PersonColumnMigration } from '@/shared/server/person-column-migration';

/**
 * Catalog apps whose natural person columns are migrating from free text to a platform
 * `users.id`. Mirrors the `lookupProvider: 'lab-user'` fields in `catalog-manifests.ts`.
 *
 * The text column is retained as a display mirror; only the new `*_user_id` column is
 * validated. Keep this list in sync with the manifests — the test
 * `catalog-person-columns.test.ts` asserts that they agree.
 */
export const CATALOG_PERSON_COLUMNS: Readonly<Record<string, readonly PersonColumnMigration[]>> = {
  'app-okr-goals': [{ table: 'okr_objectives', textColumn: 'owner_name', userColumn: 'owner_id' }],
  'app-project-charter': [
    { table: 'charters', textColumn: 'sponsor', userColumn: 'sponsor_id' },
    { table: 'charters', textColumn: 'stakeholders', userColumn: 'stakeholders_owner_id' },
  ],
  'app-suggestion-box': [
    { table: 'suggestions', textColumn: 'author', userColumn: 'author_id' },
  ],
  'app-expense-reports': [
    { table: 'expense_reports', textColumn: 'submitter', userColumn: 'submitter_id' },
  ],
  'app-knowledge-base': [{ table: 'kb_articles', textColumn: 'author', userColumn: 'author_id' }],
  'app-onboarding-checklist': [
    { table: 'onboarding_checklists', textColumn: 'new_hire', userColumn: 'new_hire_id' },
    { table: 'onboarding_tasks', textColumn: 'owner', userColumn: 'owner_id' },
  ],
  'app-event-rsvp': [
    { table: 'rsvp_responses', textColumn: 'guest_name', userColumn: 'guest_user_id' },
  ],
  // Time Tracking has **no** person column — `project` is a free-text label, not a person.
  // The column is added with no backfill; new writes populate it from the lookup.
  'app-time-tracking': [{ table: 'time_entries', userColumn: 'user_id' }],
  'app-training-quizzes': [
    { table: 'learner_certifications', textColumn: 'learner', userColumn: 'learner_id' },
  ],
} as const;

/**
 * Person columns on tables that are **not** exposed as manifest entities.
 *
 * `quiz_attempts` and `poll_votes` are written by the app's own UI (attempt submission,
 * vote casting) rather than through a connector dialog, so they have no entity surface and
 * no `lab-user` manifest field to pair with. They still need a real `users.id` for phase-30
 * seeding and for any future reporting, so they migrate the same way.
 */
export const CATALOG_NON_ENTITY_PERSON_COLUMNS: Readonly<
  Record<string, readonly PersonColumnMigration[]>
> = {
  'app-training-quizzes': [
    { table: 'quiz_attempts', textColumn: 'learner', userColumn: 'learner_id' },
  ],
  'app-polls-surveys': [{ table: 'poll_votes', textColumn: 'voter', userColumn: 'voter_id' }],
} as const;

/** Apps whose person columns migrate on boot. */
export const CATALOG_PERSON_COLUMN_APP_IDS = [
  ...Object.keys(CATALOG_PERSON_COLUMNS),
  ...Object.keys(CATALOG_NON_ENTITY_PERSON_COLUMNS),
];

/** All person-column migrations for an app, entity-backed and non-entity alike. */
export function catalogPersonColumnsFor(appId: string): readonly PersonColumnMigration[] {
  return [
    ...(CATALOG_PERSON_COLUMNS[appId] ?? []),
    ...(CATALOG_NON_ENTITY_PERSON_COLUMNS[appId] ?? []),
  ];
}
