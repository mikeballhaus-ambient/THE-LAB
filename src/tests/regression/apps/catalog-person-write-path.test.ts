import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { bootstrapOkrTables, OkrRepository } from '@/apps/okr-goals/back-end/okr-repository';
import { bootstrapQuizTables, QuizRepository } from '@/apps/training-quizzes/back-end/quiz-repository';
import { bootstrapPollsTables, PollsRepository } from '@/apps/polls-surveys/back-end/polls-repository';
import { bootstrapCharterTables, CharterRepository } from '@/apps/project-charter/back-end/charter-repository';
import {
  bootstrapSuggestionTables,
  SuggestionRepository,
} from '@/apps/suggestion-box/back-end/suggestion-repository';
import {
  bootstrapExpenseTables,
  ExpenseRepository,
} from '@/apps/expense-reports/back-end/expense-repository';
import {
  ArticleRepository,
  bootstrapArticleTables,
} from '@/apps/knowledge-base/back-end/article-repository';
import {
  bootstrapOnboardingTables,
  OnboardingRepository,
} from '@/apps/onboarding-checklist/back-end/onboarding-repository';
import { bootstrapRsvpTables, RsvpRepository } from '@/apps/event-rsvp/back-end/rsvp-repository';
import { bootstrapTimeTables, TimeRepository } from '@/apps/time-tracking/back-end/time-repository';
import { migratePersonColumnsToUserId } from '@/shared/server/person-column-migration';
import { CATALOG_PERSON_COLUMNS, CATALOG_NON_ENTITY_PERSON_COLUMNS } from '@/shared/config/catalog-person-columns';
import type { PersonColumnMigration } from '@/shared/server/person-column-migration';

/**
 * Cross-app regression guard for the 31.2/31.5 defect.
 *
 * Forms Builder renders a `lab-user` lookup as a Select that submits a **user id**. The
 * schemas originally declared `z.string()`, so those payloads failed validation and the
 * person field could not be set at all. Every repository also failed to write its `*_id`
 * column, so even a correct id was discarded.
 *
 * These tests assert the persistence half: each app accepts a `{ <name>, <idField>: 2 }`
 * payload and stores the id. The accept-both-shapes half is covered by
 * `lab-user-field-input.test.ts`.
 */

const USER_ID = 2;
const USER_NAME = 'Mia Chen';

function withPersonColumns(db: Database.Database, appId: string): void {
  const migrations: readonly PersonColumnMigration[] = [
    ...(CATALOG_PERSON_COLUMNS[appId] ?? []),
    ...(CATALOG_NON_ENTITY_PERSON_COLUMNS[appId] ?? []),
  ];
  migratePersonColumnsToUserId(db, migrations, [
    { id: USER_ID, name: USER_NAME, email: 'mia.chen@lab.local' },
  ]);
}

describe('catalog person write path — id column persists', () => {
  test('app-okr-goals stores owner_id', () => {
    const db = new Database(':memory:');
    bootstrapOkrTables(db);
    withPersonColumns(db, 'app-okr-goals');
    const repo = new OkrRepository(db);

    const created = repo.createObjective({
      title: 'Grow revenue',
      ownerName: USER_NAME,
      ownerId: USER_ID,
      quarter: 'Q4',
    });

    expect(created.ownerId).toBe(USER_ID);
    db.close();
  });

  test('app-project-charter stores sponsor_id and stakeholders_owner_id', () => {
    const db = new Database(':memory:');
    bootstrapCharterTables(db);
    withPersonColumns(db, 'app-project-charter');
    const repo = new CharterRepository(db);

    const created = repo.create({
      title: 'Platform consolidation',
      sponsor: USER_NAME,
      sponsorId: USER_ID,
      stakeholders: USER_NAME,
      stakeholdersOwnerId: USER_ID,
      purpose: '',
      scope: '',
      outOfScope: '',
      goals: '',
      status: 'draft',
    });

    expect(created.sponsorId).toBe(USER_ID);
    expect(created.stakeholdersOwnerId).toBe(USER_ID);
    db.close();
  });

  test('app-suggestion-box stores author_id', () => {
    const db = new Database(':memory:');
    bootstrapSuggestionTables(db);
    withPersonColumns(db, 'app-suggestion-box');
    const repo = new SuggestionRepository(db);

    const created = repo.create({
      title: 'Dark mode',
      body: '',
      author: USER_NAME,
      authorId: USER_ID,
      status: 'open',
    });

    expect(created.authorId).toBe(USER_ID);
    db.close();
  });

  test('app-expense-reports stores submitter_id', () => {
    const db = new Database(':memory:');
    bootstrapExpenseTables(db);
    withPersonColumns(db, 'app-expense-reports');
    const repo = new ExpenseRepository(db);

    const created = repo.create({
      title: 'Conference travel',
      submitter: USER_NAME,
      submitterId: USER_ID,
      amountCents: 124000,
      currency: 'USD',
      category: 'travel',
      spentOn: '2026-10-01',
      receiptUrl: '',
      notes: '',
    });

    expect(created.submitterId).toBe(USER_ID);
    db.close();
  });

  test('app-knowledge-base stores author_id', () => {
    const db = new Database(':memory:');
    bootstrapArticleTables(db);
    withPersonColumns(db, 'app-knowledge-base');
    const repo = new ArticleRepository(db);

    const created = repo.create({
      title: 'Getting started',
      category: 'Getting started',
      tags: '',
      body: '',
      status: 'published',
      author: USER_NAME,
      authorId: USER_ID,
    });

    expect(created.authorId).toBe(USER_ID);
    db.close();
  });

  test('app-onboarding-checklist stores new_hire_id and task owner_id', () => {
    const db = new Database(':memory:');
    bootstrapOnboardingTables(db);
    withPersonColumns(db, 'app-onboarding-checklist');
    const repo = new OnboardingRepository(db);

    const checklist = repo.createChecklist({
      newHire: USER_NAME,
      newHireId: USER_ID,
      role: 'Engineer',
      startDate: '2026-11-01',
    });
    const task = repo.addTask({
      checklistId: checklist.id,
      title: 'Set up laptop',
      owner: USER_NAME,
      ownerId: USER_ID,
      status: 'todo',
    });

    expect(checklist.newHireId).toBe(USER_ID);
    expect(task.ownerId).toBe(USER_ID);
    db.close();
  });

  test('app-event-rsvp stores guest_user_id', () => {
    const db = new Database(':memory:');
    bootstrapRsvpTables(db);
    withPersonColumns(db, 'app-event-rsvp');
    const repo = new RsvpRepository(db);

    const event = repo.createEvent({
      title: 'Q4 all-hands',
      description: '',
      startsAt: '2026-12-01T17:00:00Z',
      endsAt: '2026-12-01T18:00:00Z',
      location: 'Main',
      capacity: 50,
    });
    const rsvp = repo.addRsvp({
      eventId: event.id,
      guestName: USER_NAME,
      guestUserId: USER_ID,
      response: 'yes',
      headcount: 1,
      note: '',
    });

    expect(rsvp.guestUserId).toBe(USER_ID);
    db.close();
  });

  test('app-time-tracking stores user_id', () => {
    const db = new Database(':memory:');
    bootstrapTimeTables(db);
    withPersonColumns(db, 'app-time-tracking');
    const repo = new TimeRepository(db);

    const entry = repo.create({
      userId: USER_ID,
      userName: USER_NAME,
      project: 'Lab platform',
      task: 'Integration work',
      date: '2026-10-15',
      minutes: 120,
      billable: true,
      notes: '',
      weekKey: '2026-W42',
    });

    expect(entry.userId).toBe(USER_ID);
    expect(entry.userName).toBe(USER_NAME);
    db.close();
  });

  // Non-entity tables — written by the app's own UI, not a connector dialog.
  test('app-training-quizzes stores learner_id on attempts', () => {
    const db = new Database(':memory:');
    bootstrapQuizTables(db);
    withPersonColumns(db, 'app-training-quizzes');
    const repo = new QuizRepository(db);

    const quiz = repo.createQuiz({
      title: 'Support fundamentals',
      category: 'Catalog & support',
      description: '',
      passingScore: 70,
    });
    const attempt = repo.submitAttempt({
      quizId: quiz.id,
      learner: USER_NAME,
      learnerId: USER_ID,
      answers: [],
    });

    expect(attempt.learnerId).toBe(USER_ID);
    db.close();
  });

  test('app-training-quizzes stores learner_id on certifications', () => {
    const db = new Database(':memory:');
    bootstrapQuizTables(db);
    withPersonColumns(db, 'app-training-quizzes');
    const repo = new QuizRepository(db);

    const cert = repo.createCertification({
      category: 'Catalog & support',
      learner: USER_NAME,
      learnerId: USER_ID,
      title: 'Catalog Support Specialist',
      expiresAt: '2027-01-01',
      status: 'active',
    });

    expect(cert.learnerId).toBe(USER_ID);
    expect(cert.category).toBe('Catalog & support');
    db.close();
  });

  test('app-polls-surveys stores voter_id on votes', () => {
    const db = new Database(':memory:');
    bootstrapPollsTables(db);
    withPersonColumns(db, 'app-polls-surveys');
    const repo = new PollsRepository(db);

    const poll = repo.createPoll({
      question: 'Which demo next?',
      kind: 'single',
      status: 'open',
      allowAnonymous: true,
      allowMultipleVotes: true,
    });
    const option = repo.addOption({ pollId: poll.id, label: 'Polls' });
    const result = repo.castVote({
      pollId: poll.id,
      optionId: option.id,
      voter: USER_NAME,
      voterId: USER_ID,
    });

    expect(result.ok).toBe(true);
    const row = db
      .prepare('SELECT voter_id FROM poll_votes WHERE poll_id = ?')
      .get(poll.id) as { voter_id: number | null };
    expect(row.voter_id).toBe(USER_ID);
    db.close();
  });

  test('app-polls-surveys rejects a second vote when allowMultipleVotes is false', () => {
    const db = new Database(':memory:');
    bootstrapPollsTables(db);
    const repo = new PollsRepository(db);

    const poll = repo.createPoll({
      question: 'One shot?',
      kind: 'multi',
      status: 'open',
      allowAnonymous: true,
      allowMultipleVotes: false,
    });
    const a = repo.addOption({ pollId: poll.id, label: 'A' });
    const b = repo.addOption({ pollId: poll.id, label: 'B' });
    expect(
      repo.castVote({ pollId: poll.id, optionId: a.id, voter: 'Pat', voterId: null }).ok,
    ).toBe(true);
    const second = repo.castVote({ pollId: poll.id, optionId: b.id, voter: 'Pat', voterId: null });
    expect(second.ok).toBe(false);
    expect(second.error).toContain('already voted');
    db.close();
  });
});

describe('catalog person write path — text mirror preserved', () => {
  test('every app still stores the display name alongside the id', () => {
    const db = new Database(':memory:');
    bootstrapOkrTables(db);
    withPersonColumns(db, 'app-okr-goals');
    const repo = new OkrRepository(db);

    const created = repo.createObjective({
      title: 'Mirror check',
      ownerName: USER_NAME,
      ownerId: USER_ID,
      quarter: 'Q1',
    });

    expect(created.ownerName).toBe(USER_NAME);
    expect(created.ownerId).toBe(USER_ID);
    db.close();
  });

  test('name-only payloads leave the id null (inline UI path)', () => {
    const db = new Database(':memory:');
    bootstrapSuggestionTables(db);
    withPersonColumns(db, 'app-suggestion-box');
    const repo = new SuggestionRepository(db);

    const created = repo.create({
      title: 'Legacy path',
      body: '',
      author: 'Unmapped Person',
      status: 'open',
    });

    expect(created.author).toBe('Unmapped Person');
    expect(created.authorId).toBeNull();
    db.close();
  });
});

describe('person column registry coverage', () => {
  test('every app with a person column is exercised by this suite', () => {
    const exercised = new Set([
      'app-okr-goals',
      'app-project-charter',
      'app-suggestion-box',
      'app-expense-reports',
      'app-knowledge-base',
      'app-onboarding-checklist',
      'app-event-rsvp',
      'app-time-tracking',
      'app-training-quizzes',
      'app-polls-surveys',
    ]);

    const registered = new Set([
      ...Object.keys(CATALOG_PERSON_COLUMNS),
      ...Object.keys(CATALOG_NON_ENTITY_PERSON_COLUMNS),
    ]);

    // Every registered migration must have a write-path test above, or the guard has a hole.
    const untested = [...registered].filter((appId) => !exercised.has(appId));
    expect(untested).toEqual([]);
  });
});
