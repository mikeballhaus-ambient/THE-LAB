import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  DEMO_ACCOUNTS,
  DEMO_CAST_WITH_ADMIN,
  DEMO_TODAY,
  isDemoAccountName,
  isDemoCastName,
} from '@/shared/config/demo-data-cast';

import {
  hasOkrGoalsDemoDataset,
  okrGoalsDemoCastNames,
  okrGoalsDemoStatuses,
  removeOkrGoalsDemo,
  seedOkrGoalsDemoIfMissing,
} from '@/apps/okr-goals/back-end/db/seed-okr-goals-demo';
import {
  hasTravelDemoDataset,
  removeTravelDemo,
  seedTravelDemoIfMissing,
  travelDemoItemKinds,
} from '@/apps/travel-itinerary/back-end/db/seed-travel-demo';
import {
  charterDemoCastNames,
  charterDemoStatuses,
  removeCharterDemo,
  seedCharterDemoIfMissing,
} from '@/apps/project-charter/back-end/db/seed-charter-demo';
import {
  removeTimeTrackingDemo,
  seedTimeTrackingDemoIfMissing,
  timeTrackingDemoProjects,
  timeTrackingDemoStatuses,
  timeTrackingDemoEntryCount,
  TIME_TRACKING_DEMO_ENTRIES_PER_USER,
  TIME_TRACKING_DEMO_PACK_ID,
} from '@/apps/time-tracking/back-end/db/seed-time-tracking-demo';
import { insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger } from '@/shared/server/demo-seed-ledger';
import {
  applicantDemoNames,
  applicantDemoStages,
  applicantDemoEntryCount,
  removeApplicantDemo,
  seedApplicantDemoIfMissing,
} from '@/apps/job-applicant-tracker/back-end/db/seed-applicant-demo';
import {
  removeSuggestionDemo,
  seedSuggestionDemoIfMissing,
  suggestionDemoAuthors,
  suggestionDemoStatuses,
} from '@/apps/suggestion-box/back-end/db/seed-suggestion-demo';
import {
  EXPENSE_DEMO_NORTHWIND_CENTS,
  EXPENSE_DEMO_NORTHWIND_TITLE,
  expenseDemoStatuses,
  expenseDemoSubmitters,
  removeExpenseDemo,
  seedExpenseDemoIfMissing,
} from '@/apps/expense-reports/back-end/db/seed-expense-demo';
import {
  hasKbDemoDataset,
  kbDemoAuthors,
  kbDemoCategories,
  kbDemoStatuses,
  removeKbDemo,
  seedKbDemoIfMissing,
} from '@/apps/knowledge-base/back-end/db/seed-kb-demo';
import {
  QUIZ_DEMO_SPECS,
} from '@/apps/training-quizzes/shared/quiz-demo-content';
import {
  QUIZ_DEMO_SUPPORT_TITLE,
  quizDemoLearners,
  quizDemoTitles,
  removeQuizDemo,
  seedQuizDemoIfMissing,
} from '@/apps/training-quizzes/back-end/db/seed-quiz-demo';
import {
  ONBOARDING_DEMO_SUPPORT_HIRE,
  ONBOARDING_DEMO_SUPPORT_ROLE,
  onboardingDemoPersonNames,
  onboardingDemoTaskStatuses,
  removeOnboardingDemo,
  seedOnboardingDemoIfMissing,
} from '@/apps/onboarding-checklist/back-end/db/seed-onboarding-demo';
import {
  hasWeatherDemoDataset,
  removeWeatherDemo,
  seedWeatherDemoIfMissing,
  weatherDemoLocationNames,
} from '@/apps/weather-dashboard/back-end/db/seed-weather-demo';
import {
  hasHomeDemoDataset,
  homeDemoAssetNames,
  homeDemoPriorities,
  homeDemoStatuses,
  removeHomeDemo,
  seedHomeDemoIfMissing,
} from '@/apps/home-maintenance/back-end/db/seed-home-demo';
import {
  rentalDemoLeaseStatuses,
  rentalDemoPaymentStatuses,
  rentalDemoPropertyStatuses,
  rentalDemoTenantNames,
  removeRentalDemo,
  seedRentalDemoIfMissing,
} from '@/apps/rental-property/back-end/db/seed-rental-demo';
import {
  removeRsvpDemo,
  rsvpDemoGuestNames,
  rsvpDemoResponses,
  seedRsvpDemoIfMissing,
} from '@/apps/event-rsvp/back-end/db/seed-rsvp-demo';
import {
  pollsDemoKinds,
  pollsDemoStatuses,
  pollsDemoVoterNames,
  removePollsDemo,
  seedPollsDemoIfMissing,
} from '@/apps/polls-surveys/back-end/db/seed-polls-demo';

/**
 * Wave C catalog demo seed packs.
 *
 * Each app gets its own in-memory DB with the tables its seed touches. The suite asserts the
 * shared contract every pack must satisfy (plan §5, phase doc "Canonical rules"):
 *
 * - idempotent (second run inserts nothing)
 * - every person row sets both the display name *and* the `*_id` column
 * - every person name is in `DEMO_CAST`; every company is in `DEMO_ACCOUNTS`
 * - every enum value appears at least once
 * - remove deletes only what the seed created
 */

function memoryDb(ddl: string): Database.Database {
  const db = new Database(':memory:');
  db.exec(ddl);
  return db;
}

const CONFIGS = `
  CREATE TABLE configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'string',
    description TEXT DEFAULT NULL
  );
`;

function namesAreCast(names: readonly string[]): void {
  for (const name of names) {
    expect({ name, ok: isDemoCastName(name) }).toEqual({ name, ok: true });
  }
}

function columns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name);
}

describe('catalog demo seeds — shared contract', () => {
  test('okr-goals: objectives + key results, both owner columns, every status', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE okr_objectives (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        owner_name TEXT NOT NULL DEFAULT '', quarter TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE okr_key_results (id INTEGER PRIMARY KEY AUTOINCREMENT, objective_id INTEGER NOT NULL,
        title TEXT NOT NULL, metric TEXT NOT NULL DEFAULT '', baseline REAL NOT NULL DEFAULT 0,
        target REAL NOT NULL DEFAULT 100, current REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'not-started', "order" INTEGER NOT NULL DEFAULT 0);
    `);

    expect(seedOkrGoalsDemoIfMissing(db).inserted).toBe(11);
    expect(seedOkrGoalsDemoIfMissing(db).inserted).toBe(0);
    expect(hasOkrGoalsDemoDataset(db)).toBe(true);

    const rows = db
      .prepare('SELECT owner_name, owner_id FROM okr_objectives')
      .all() as { owner_name: string; owner_id: number | null }[];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.owner_id).toBeGreaterThan(0);
    }
    namesAreCast(rows.map((row) => row.owner_name));
    namesAreCast(okrGoalsDemoCastNames());
    expect(okrGoalsDemoStatuses().sort()).toEqual(['at-risk', 'done', 'not-started', 'on-track']);

    expect(removeOkrGoalsDemo(db)).toBe(11);
    expect(hasOkrGoalsDemoDataset(db)).toBe(false);
  });

  test('travel: two trips with every item kind', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE travel_trips (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        destination TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '',
        end_date TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE travel_items (id INTEGER PRIMARY KEY AUTOINCREMENT, trip_id INTEGER NOT NULL,
        kind TEXT NOT NULL DEFAULT 'activity', title TEXT NOT NULL,
        start_at TEXT NOT NULL DEFAULT '', end_at TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '', confirmation TEXT NOT NULL DEFAULT '',
        "order" INTEGER NOT NULL DEFAULT 0);
    `);

    expect(seedTravelDemoIfMissing(db).inserted).toBe(10);
    expect(seedTravelDemoIfMissing(db).inserted).toBe(0);
    // Every kind used by the seed is a known itinerary kind; `other` is not used.
    expect(travelDemoItemKinds().sort()).toEqual(['activity', 'flight', 'hotel', 'transport']);
    expect(removeTravelDemo(db)).toBe(10);
    expect(hasTravelDemoDataset(db)).toBe(false);
  });

  test('charter: sponsor + lead stakeholder ids, every status', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE charters (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        sponsor TEXT NOT NULL DEFAULT '', purpose TEXT NOT NULL DEFAULT '',
        scope TEXT NOT NULL DEFAULT '', out_of_scope TEXT NOT NULL DEFAULT '',
        stakeholders TEXT NOT NULL DEFAULT '', goals TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    expect(seedCharterDemoIfMissing(db).inserted).toBe(2);
    expect(seedCharterDemoIfMissing(db).inserted).toBe(0);

    const rows = db
      .prepare('SELECT sponsor, sponsor_id, stakeholders, stakeholders_owner_id FROM charters')
      .all() as {
      sponsor: string;
      sponsor_id: number | null;
      stakeholders: string;
      stakeholders_owner_id: number | null;
    }[];
    for (const row of rows) {
      expect(row.sponsor_id).toBeGreaterThan(0);
      expect(row.stakeholders_owner_id).toBeGreaterThan(0);
      expect(isDemoCastName(row.sponsor)).toBe(true);
      for (const name of row.stakeholders.split(';').map((n) => n.trim())) {
        expect({ name, ok: isDemoCastName(name) }).toEqual({ name, ok: true });
      }
    }
    namesAreCast(charterDemoCastNames());
    expect(charterDemoStatuses().sort()).toEqual(['active', 'draft']);
    expect(removeCharterDemo(db)).toBe(2);
  });

  test('time-tracking: user_id on every row, five entries per cast member, every status', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE time_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, project TEXT NOT NULL DEFAULT '',
        task TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '',
        minutes INTEGER NOT NULL DEFAULT 0, billable INTEGER NOT NULL DEFAULT 1,
        notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
        week_key TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    const expectedCount = timeTrackingDemoEntryCount();
    expect(seedTimeTrackingDemoIfMissing(db).inserted).toBe(expectedCount);
    expect(seedTimeTrackingDemoIfMissing(db).inserted).toBe(0);

    const rows = db.prepare('SELECT user_id, week_key FROM time_entries').all() as {
      user_id: number | null;
      week_key: string;
    }[];
    expect(rows).toHaveLength(expectedCount);
    for (const row of rows) {
      expect(row.user_id).toBeGreaterThan(0);
      expect(row.week_key).toMatch(/^\d{4}-W\d{2}$/);
    }
    const perUser = db
      .prepare('SELECT user_id, COUNT(*) AS n FROM time_entries GROUP BY user_id')
      .all() as { user_id: number; n: number }[];
    for (const row of perUser) {
      expect(row.n).toBeGreaterThanOrEqual(TIME_TRACKING_DEMO_ENTRIES_PER_USER);
    }
    expect(timeTrackingDemoProjects().sort()).toEqual(['CRM integration', 'Lab platform', 'Northwind platform']);
    expect(timeTrackingDemoStatuses().sort()).toEqual(['draft', 'submitted']);
    expect(removeTimeTrackingDemo(db)).toBe(expectedCount);
  });

  test('time-tracking: replaces stale demo pack when row count drifts', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE time_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, project TEXT NOT NULL DEFAULT '',
        task TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '',
        minutes INTEGER NOT NULL DEFAULT 0, billable INTEGER NOT NULL DEFAULT 1,
        notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
        week_key TEXT NOT NULL DEFAULT '', user_id INTEGER, user_name TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    const ledger = new DemoSeedLedger(db, TIME_TRACKING_DEMO_PACK_ID);
    for (let i = 0; i < 12; i += 1) {
      const id = insertRow(db, 'time_entries', {
        user_id: 2,
        user_name: 'Legacy',
        project: 'Legacy',
        task: 'Old pack',
        date: '2026-10-01',
        minutes: 60,
        billable: 1,
        notes: '',
        status: 'draft',
        week_key: '2026-W40',
        created_at: '2026-10-01T09:00:00',
      });
      ledger.track('time_entries', id);
    }

    const expectedCount = timeTrackingDemoEntryCount();
    expect(seedTimeTrackingDemoIfMissing(db).inserted).toBe(expectedCount);
    expect(db.prepare('SELECT COUNT(*) AS c FROM time_entries').get()).toEqual({ c: expectedCount });
  });

  test('applicants: every hiring stage, external candidates are not cast members', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE applicants (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
        stage TEXT NOT NULL DEFAULT 'applied', notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    const expectedCount = applicantDemoEntryCount();
    expect(seedApplicantDemoIfMissing(db).inserted).toBe(expectedCount);
    expect(applicantDemoStages().sort()).toEqual([
      'applied',
      'hired',
      'interview',
      'offer',
      'rejected',
      'screening',
    ]);
    for (const name of applicantDemoNames()) {
      expect(isDemoCastName(name)).toBe(false);
    }
    expect(removeApplicantDemo(db)).toBe(expectedCount);
  });

  test('suggestions: every status, author ids, cast authors', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE suggestions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '', author TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open', votes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    expect(seedSuggestionDemoIfMissing(db).inserted).toBe(5);
    const rows = db.prepare('SELECT author, author_id FROM suggestions').all() as {
      author: string;
      author_id: number | null;
    }[];
    for (const row of rows) {
      expect(row.author_id).toBeGreaterThan(0);
    }
    namesAreCast(suggestionDemoAuthors());
    expect(suggestionDemoStatuses().sort()).toEqual([
      'declined',
      'done',
      'in-progress',
      'open',
      'planned',
    ]);
    expect(removeSuggestionDemo(db)).toBe(5);
  });

  test('expenses: integer cents, every status, Northwind story anchor', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE expense_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        submitter TEXT NOT NULL DEFAULT '', submitter_id INTEGER,
        amount_cents INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD', category TEXT NOT NULL DEFAULT '',
        spent_on TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
        receipt_url TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    expect(seedExpenseDemoIfMissing(db).inserted).toBe(8);
    expect(seedExpenseDemoIfMissing(db).inserted).toBe(0);
    expect(seedExpenseDemoIfMissing(db, { adminApply: true }).inserted).toBe(8);

    const rows = db.prepare('SELECT title, submitter, submitter_id, amount_cents FROM expense_reports').all() as {
      title: string;
      submitter: string;
      submitter_id: number | null;
      amount_cents: number;
    }[];
    for (const row of rows) {
      expect(row.submitter_id).toBeGreaterThan(0);
      expect(Number.isInteger(row.amount_cents)).toBe(true);
      expect(row.amount_cents).toBeGreaterThan(0);
    }
    const northwind = rows.find((row) => row.title === EXPENSE_DEMO_NORTHWIND_TITLE);
    expect(northwind?.amount_cents).toBe(EXPENSE_DEMO_NORTHWIND_CENTS);
    expect(northwind?.submitter).toBe('Mia Chen');

    namesAreCast(expenseDemoSubmitters());
    expect(expenseDemoStatuses().sort()).toEqual([
      'approved',
      'draft',
      'reimbursed',
      'rejected',
      'submitted',
    ]);
    expect(removeExpenseDemo(db)).toBe(8);
  });

  test('knowledge base demo pack: 6 articles, cast authors, draft + published', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE kb_articles (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
        author TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    expect(seedKbDemoIfMissing(db).inserted).toBe(6);
    const rows = db.prepare('SELECT author, author_id, status FROM kb_articles').all() as {
      author: string;
      author_id: number | null;
      status: string;
    }[];
    for (const row of rows) {
      expect(row.author_id).toBeGreaterThan(0);
    }
    namesAreCast(kbDemoAuthors());
    expect(kbDemoStatuses().sort()).toEqual(['draft', 'published']);
    expect(kbDemoCategories().sort()).toEqual(['Getting started', 'Integrations', 'Platform']);
    expect(removeKbDemo(db)).toBe(6);
    expect(hasKbDemoDataset(db)).toBe(false);
  });

  test('quizzes: demo pack by category (About/KB topics), learner ids, Story B anchor', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE quizzes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
        passing_score INTEGER NOT NULL DEFAULT 70,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE quiz_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER NOT NULL,
        prompt TEXT NOT NULL, options_json TEXT NOT NULL DEFAULT '[]',
        correct_index INTEGER NOT NULL DEFAULT 0, "order" INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id INTEGER NOT NULL,
        learner TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE learner_certifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL DEFAULT '', quiz_id INTEGER,
        learner TEXT NOT NULL DEFAULT '', learner_id INTEGER, title TEXT NOT NULL,
        expires_at TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
        issued_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    const expectedQuizzes = QUIZ_DEMO_SPECS.length;
    const expectedQuestions = QUIZ_DEMO_SPECS.reduce((n, q) => n + q.questions.length, 0);
    const expectedAttempts = 6;
    const expectedDemoCerts = 3;
    const expectedInserted = expectedQuizzes + expectedQuestions + expectedAttempts + expectedDemoCerts;

    expect(seedQuizDemoIfMissing(db).inserted).toBe(expectedInserted);
    const count = (table: string): number =>
      (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
    expect(count('quizzes')).toBe(expectedQuizzes);
    expect(count('quiz_questions')).toBe(expectedQuestions);
    expect(count('quiz_attempts')).toBe(expectedAttempts);
    expect(count('learner_certifications')).toBe(expectedDemoCerts);

    const attempts = db.prepare('SELECT learner, learner_id FROM quiz_attempts').all() as {
      learner: string;
      learner_id: number | null;
    }[];
    for (const attempt of attempts) {
      expect(attempt.learner_id).toBeGreaterThan(0);
    }
    namesAreCast(quizDemoLearners());
    expect(quizDemoTitles()).toContain(QUIZ_DEMO_SUPPORT_TITLE);
    expect(removeQuizDemo(db)).toBe(expectedInserted);
  });

  test('onboarding: 3 checklists / 12 tasks, hire + owner ids, Story B anchor', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE onboarding_checklists (id INTEGER PRIMARY KEY AUTOINCREMENT, new_hire TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE onboarding_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, checklist_id INTEGER NOT NULL,
        title TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo', "order" INTEGER NOT NULL DEFAULT 0);
    `);

    expect(seedOnboardingDemoIfMissing(db).inserted).toBe(15);

    const checklists = db.prepare('SELECT new_hire, new_hire_id, role FROM onboarding_checklists').all() as {
      new_hire: string;
      new_hire_id: number | null;
      role: string;
    }[];
    expect(checklists).toHaveLength(3);
    for (const checklist of checklists) {
      expect(checklist.new_hire_id).toBeGreaterThan(0);
    }
    const support = checklists.find((c) => c.new_hire === ONBOARDING_DEMO_SUPPORT_HIRE);
    expect(support?.role).toBe(ONBOARDING_DEMO_SUPPORT_ROLE);

    const tasks = db.prepare('SELECT owner, owner_id FROM onboarding_tasks').all() as {
      owner: string;
      owner_id: number | null;
    }[];
    expect(tasks).toHaveLength(12);
    for (const task of tasks) {
      expect(task.owner_id).toBeGreaterThan(0);
    }
    namesAreCast(onboardingDemoPersonNames());
    expect(onboardingDemoTaskStatuses().sort()).toEqual(['doing', 'done', 'todo']);
    expect(removeOnboardingDemo(db)).toBe(15);
  });

  test('weather: 3 saved locations, no condition snapshots', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE weather_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        latitude REAL NOT NULL DEFAULT 0, longitude REAL NOT NULL DEFAULT 0,
        "order" INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE weather_observations (id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL, condition TEXT NOT NULL DEFAULT 'clear',
        temp_c REAL NOT NULL DEFAULT 0, humidity INTEGER NOT NULL DEFAULT 0,
        wind_kph REAL NOT NULL DEFAULT 0, observed_at TEXT NOT NULL DEFAULT (datetime('now')),
        notes TEXT NOT NULL DEFAULT '');
    `);

    // Locations only — conditions are always live and are never seeded.
    expect(seedWeatherDemoIfMissing(db).inserted).toBe(3);
    expect(weatherDemoLocationNames()).toEqual(['Denver, CO', 'San Jose, CA', 'Washington, DC']);
    expect(removeWeatherDemo(db)).toBe(3);
    expect(hasWeatherDemoDataset(db)).toBe(false);
  });

  test('home maintenance: 4 assets / 10 tasks, every status + priority', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE home_assets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE home_maintenance_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL, title TEXT NOT NULL, due_date TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'scheduled', priority TEXT NOT NULL DEFAULT 'normal',
        completed_at TEXT, notes TEXT NOT NULL DEFAULT '');
    `);

    expect(seedHomeDemoIfMissing(db).inserted).toBe(14);
    expect(homeDemoAssetNames()).toHaveLength(4);
    expect(homeDemoStatuses().sort()).toEqual(['done', 'due', 'scheduled', 'skipped']);
    expect(homeDemoPriorities().sort()).toEqual(['high', 'low', 'normal']);
    expect(removeHomeDemo(db)).toBe(14);
    expect(hasHomeDemoDataset(db)).toBe(false);
  });

  test('rental: 3 properties / 4 leases / 10 payments, integer cents, external tenants', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE rental_properties (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '', monthly_rent_cents INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'vacant', notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE rental_leases (id INTEGER PRIMARY KEY AUTOINCREMENT, property_id INTEGER NOT NULL,
        tenant_name TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '',
        end_date TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active');
      CREATE TABLE rental_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, lease_id INTEGER NOT NULL,
        period_month TEXT NOT NULL DEFAULT '', amount_cents INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'due', paid_at TEXT);
    `);

    // 4 properties + 4 leases + 10 payments — the fourth property carries `vacant` (rule 6).
    expect(seedRentalDemoIfMissing(db).inserted).toBe(18);

    const properties = db.prepare('SELECT monthly_rent_cents FROM rental_properties').all() as {
      monthly_rent_cents: number;
    }[];
    for (const property of properties) {
      expect(Number.isInteger(property.monthly_rent_cents)).toBe(true);
    }
    const payments = db.prepare('SELECT amount_cents, paid_at, status FROM rental_payments').all() as {
      amount_cents: number;
      paid_at: string | null;
      status: string;
    }[];
    expect(payments).toHaveLength(10);
    for (const payment of payments) {
      expect(Number.isInteger(payment.amount_cents)).toBe(true);
      expect(payment.status === 'paid' ? payment.paid_at != null : payment.paid_at == null).toBe(true);
    }

    expect(rentalDemoPropertyStatuses().sort()).toEqual(['maintenance', 'occupied', 'vacant']);
    expect(rentalDemoLeaseStatuses().sort()).toEqual(['active', 'ended', 'pending']);
    expect(rentalDemoPaymentStatuses().sort()).toEqual(['due', 'late', 'paid']);
    for (const tenant of rentalDemoTenantNames()) {
      expect(isDemoCastName(tenant)).toBe(false);
    }
    expect(removeRentalDemo(db)).toBe(18);
  });

  test('event rsvp: 3 events / 12 responses, cast guests, every response', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE rsvp_events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL DEFAULT '',
        ends_at TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
        capacity INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE rsvp_responses (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL,
        guest_name TEXT NOT NULL, response TEXT NOT NULL DEFAULT 'yes',
        headcount INTEGER NOT NULL DEFAULT 1, note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    expect(seedRsvpDemoIfMissing(db).inserted).toBe(15);

    const responses = db.prepare('SELECT guest_name, guest_user_id FROM rsvp_responses').all() as {
      guest_name: string;
      guest_user_id: number | null;
    }[];
    expect(responses).toHaveLength(12);
    for (const response of responses) {
      expect(response.guest_user_id).toBeGreaterThan(0);
    }
    namesAreCast(rsvpDemoGuestNames());
    expect(rsvpDemoResponses().sort()).toEqual(['maybe', 'no', 'yes']);
    expect(removeRsvpDemo(db)).toBe(15);
  });

  test('polls: 3 polls / 12 options / 13 votes, cast voters, every status + kind', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE polls (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'single', status TEXT NOT NULL DEFAULT 'draft',
        allow_anonymous INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE poll_options (id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id INTEGER NOT NULL,
        label TEXT NOT NULL, "order" INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE poll_votes (id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id INTEGER NOT NULL,
        option_id INTEGER NOT NULL, voter TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    expect(seedPollsDemoIfMissing(db).inserted).toBe(28);

    const votes = db.prepare('SELECT voter, voter_id FROM poll_votes').all() as {
      voter: string;
      voter_id: number | null;
    }[];
    expect(votes).toHaveLength(13);
    for (const vote of votes) {
      expect(vote.voter_id).toBeGreaterThan(0);
    }
    namesAreCast(pollsDemoVoterNames());
    expect(pollsDemoStatuses().sort()).toEqual(['closed', 'draft', 'open']);
    expect(pollsDemoKinds().sort()).toEqual(['multi', 'single']);
    expect(removePollsDemo(db)).toBe(28);
  });
});

describe('cross-app reconciliation', () => {
  test('every canonical account is a known company name', () => {
    for (const account of DEMO_ACCOUNTS) {
      expect({ account, ok: isDemoAccountName(account) }).toEqual({ account, ok: true });
    }
  });

  test('every cast member name is unique and ids are the seeded platform ids', () => {
    const names = DEMO_CAST_WITH_ADMIN.map((member) => member.name);
    expect(new Set(names).size).toBe(names.length);
    expect(DEMO_CAST_WITH_ADMIN.map((member) => member.id)).toEqual([
      1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  test('Story B is consistent across onboarding and training', () => {
    // The same hire appears in the onboarding checklist and in the Support Fundamentals attempt.
    expect(ONBOARDING_DEMO_SUPPORT_HIRE).toBe('Riley Brooks');
    expect(quizDemoLearners()).toContain(ONBOARDING_DEMO_SUPPORT_HIRE);
    expect(ONBOARDING_DEMO_SUPPORT_ROLE).toBe('Support Engineer');
  });

  test('Story A expense matches the CRM deal order of magnitude', () => {
    // CRM Northwind sale is $24,000 and the quote $24,950; the onsite travel expense is $1,240.
    expect(EXPENSE_DEMO_NORTHWIND_CENTS).toBe(124_000);
    expect(EXPENSE_DEMO_NORTHWIND_CENTS).toBeLessThan(2_400_000);
  });

  test('demo dates are anchored to the fixed demo day', () => {
    expect(DEMO_TODAY).toBe('2026-10-15');
  });

  test('seeded tables gain their *_id columns even before the app server boots', () => {
    const db = memoryDb(`${CONFIGS}
      CREATE TABLE okr_objectives (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        owner_name TEXT NOT NULL DEFAULT '', quarter TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE okr_key_results (id INTEGER PRIMARY KEY AUTOINCREMENT, objective_id INTEGER NOT NULL,
        title TEXT NOT NULL, metric TEXT NOT NULL DEFAULT '', baseline REAL NOT NULL DEFAULT 0,
        target REAL NOT NULL DEFAULT 100, current REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'not-started', "order" INTEGER NOT NULL DEFAULT 0);
    `);
    expect(columns(db, 'okr_objectives')).not.toContain('owner_id');
    seedOkrGoalsDemoIfMissing(db);
    expect(columns(db, 'okr_objectives')).toContain('owner_id');
  });
});
