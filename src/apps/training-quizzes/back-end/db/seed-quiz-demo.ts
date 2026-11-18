import type { Database } from 'better-sqlite3';
import type { DemoSeedBootAdapter } from '@/shared/server/demo-seed-boot';
import { CATALOG_DEMO_BOOT_FLAG_KEYS } from '@/shared/config/catalog-demo-seed-packs';
import { CATEGORY_CERT_DEFINITIONS } from '@/shared/training-quizzes/category-cert-definitions';
import { DEMO_TODAY, demoCastIdForName, shiftDemoDate } from '@/shared/config/demo-data-cast';
import { ensurePersonIdColumn, insertRow } from '@/shared/server/demo-seed-columns';
import { DemoSeedLedger, shouldSkipDemoSeed } from '@/shared/server/demo-seed-ledger';
import {
  QUIZ_DEMO_SPECS,
  QUIZ_DEMO_SUPPORT_TITLE,
  type QuizDemoSpec,
} from '../../shared/quiz-demo-content';
import { bootstrapQuizTables } from '../quiz-repository';

export { QUIZ_DEMO_SUPPORT_TITLE } from '../../shared/quiz-demo-content';

export const QUIZ_DEMO_PACK_ID = 'quiz-demo';
export const QUIZ_DEMO_BOOT_FLAG = CATALOG_DEMO_BOOT_FLAG_KEYS.TRAINING_QUIZZES_DEMO;

export const QUIZ_DEMO_SEED_REVISION = 4;
const QUIZ_DEMO_REVISION_FLAG = `${QUIZ_DEMO_BOOT_FLAG}:revision`;

function needsDemoRevisionRefresh(db: Database): boolean {
  try {
    const row = db
      .prepare('SELECT value FROM configs WHERE key = ? LIMIT 1')
      .get(QUIZ_DEMO_REVISION_FLAG) as { value?: string } | undefined;
    const applied = Number.parseInt(row?.value ?? '', 10);
    return !Number.isFinite(applied) || applied < QUIZ_DEMO_SEED_REVISION;
  } catch {
    return true;
  }
}

function recordDemoRevision(db: Database): void {
  db.prepare(
    `INSERT INTO configs (key, value, type, description, updated_at)
     VALUES (?, ?, 'number', 'Quiz demo seed revision', datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(QUIZ_DEMO_REVISION_FLAG, String(QUIZ_DEMO_SEED_REVISION));
}

interface AttemptSpec {
  quizTitle: string;
  learner: string;
  score: number;
  dayOffset: number;
}

const ATTEMPTS: readonly AttemptSpec[] = [
  { quizTitle: QUIZ_DEMO_SUPPORT_TITLE, learner: 'Riley Brooks', score: 100, dayOffset: -14 },
  { quizTitle: QUIZ_DEMO_SUPPORT_TITLE, learner: 'Quinn Reed', score: 67, dayOffset: -12 },
  { quizTitle: 'Integration basics', learner: 'Mia Chen', score: 100, dayOffset: -10 },
  { quizTitle: 'THE-LAB essentials', learner: 'Jordan Lee', score: 100, dayOffset: -8 },
  { quizTitle: 'Team messaging', learner: 'Sam Patel', score: 100, dayOffset: -5 },
  { quizTitle: 'Platform themes', learner: 'Taylor Nguyen', score: 67, dayOffset: -3 },
];

/** Demo cast members with a full category pass (for messaging badge previews). */
const DEMO_CATEGORY_CERTS: ReadonlyArray<{ learner: string; category: string }> = [
  { learner: 'Riley Brooks', category: 'Apps, team & support' },
  { learner: 'Jordan Lee', category: 'Platform basics' },
  { learner: 'Sam Patel', category: 'Settings & personas' },
];

function insertQuizPack(db: Database, ledger: DemoSeedLedger, quiz: QuizDemoSpec): number {
  const created = shiftDemoDate(DEMO_TODAY, quiz.dayOffset);
  const quizId = insertRow(db, 'quizzes', {
    title: quiz.title,
    category: quiz.category,
    description: quiz.description,
    passing_score: quiz.passingScore,
    created_at: `${created}T09:00:00`,
  });
  ledger.track('quizzes', quizId);

  quiz.questions.forEach((question, index) => {
    const questionId = insertRow(db, 'quiz_questions', {
      quiz_id: quizId,
      prompt: question.prompt,
      options_json: JSON.stringify(question.options),
      correct_index: question.correctIndex,
      order: index,
    });
    ledger.track('quiz_questions', questionId);
  });

  return quizId;
}

export function hasQuizDemoDataset(db: Database): boolean {
  return new DemoSeedLedger(db, QUIZ_DEMO_PACK_ID).has();
}

export interface SeedQuizDemoResult {
  inserted: number;
}

export function seedQuizDemoIfMissing(
  db: Database,
  options?: { adminApply?: boolean },
): SeedQuizDemoResult {
  const ledger = new DemoSeedLedger(db, QUIZ_DEMO_PACK_ID);
  const expectedQuizCount = QUIZ_DEMO_SPECS.length;
  const expectedQuestionCount = QUIZ_DEMO_SPECS.reduce((n, q) => n + q.questions.length, 0);

  if (options?.adminApply && ledger.has()) {
    removeQuizDemo(db);
  }

  if (needsDemoRevisionRefresh(db)) {
    if (ledger.has()) {
      removeQuizDemo(db);
    }
  } else if (ledger.has()) {
    const quizCount = (db.prepare(`SELECT COUNT(*) AS n FROM quizzes`).get() as { n: number }).n;
    const questionCount = (db.prepare(`SELECT COUNT(*) AS n FROM quiz_questions`).get() as { n: number }).n;
    if (quizCount !== expectedQuizCount || questionCount !== expectedQuestionCount) {
      removeQuizDemo(db);
    }
  }

  if (shouldSkipDemoSeed(db, ledger, QUIZ_DEMO_BOOT_FLAG, options)) {
    return { inserted: 0 };
  }

  bootstrapQuizTables(db);

  ensurePersonIdColumn(db, 'quizzes', 'owner_id');
  ensurePersonIdColumn(db, 'quiz_attempts', 'learner_id');

  let inserted = 0;
  const quizIdByTitle = new Map<string, number>();

  for (const quiz of QUIZ_DEMO_SPECS) {
    const quizId = insertQuizPack(db, ledger, quiz);
    quizIdByTitle.set(quiz.title, quizId);
    inserted += 1 + quiz.questions.length;
  }

  for (const attempt of ATTEMPTS) {
    const quizId = quizIdByTitle.get(attempt.quizTitle);
    if (quizId == null) continue;
    const quiz = QUIZ_DEMO_SPECS.find((q) => q.title === attempt.quizTitle);
    const passed = attempt.score >= (quiz?.passingScore ?? 70);
    const created = shiftDemoDate(DEMO_TODAY, attempt.dayOffset);
    const attemptId = insertRow(db, 'quiz_attempts', {
      quiz_id: quizId,
      learner: attempt.learner,
      learner_id: demoCastIdForName(attempt.learner),
      score: attempt.score,
      passed: passed ? 1 : 0,
      created_at: `${created}T14:00:00`,
    });
    ledger.track('quiz_attempts', attemptId);
    inserted += 1;
  }

  const expiresAt = shiftDemoDate(DEMO_TODAY, 365);
  for (const grant of DEMO_CATEGORY_CERTS) {
    const def = CATEGORY_CERT_DEFINITIONS.find((row) => row.category === grant.category);
    if (!def) continue;
    const certId = insertRow(db, 'learner_certifications', {
      category: grant.category,
      quiz_id: null,
      learner: grant.learner,
      learner_id: demoCastIdForName(grant.learner),
      title: def.title,
      expires_at: expiresAt,
      status: 'active',
      issued_at: `${DEMO_TODAY}T10:00:00`,
    });
    ledger.track('learner_certifications', certId);
    inserted += 1;
  }

  recordDemoRevision(db);
  return { inserted };
}

export function removeQuizDemo(db: Database): number {
  const ledger = new DemoSeedLedger(db, QUIZ_DEMO_PACK_ID);
  return ledger.deleteTracked(['quiz_attempts', 'quiz_questions', 'learner_certifications', 'quizzes']);
}

export function quizDemoTitles(): string[] {
  return QUIZ_DEMO_SPECS.map((q) => q.title);
}

export function quizDemoLearners(): string[] {
  return [...new Set(ATTEMPTS.map((a) => a.learner))];
}

export const quizDemoAdapter: DemoSeedBootAdapter = {
  bootFlagKey: QUIZ_DEMO_BOOT_FLAG,
  has: hasQuizDemoDataset,
  seed: seedQuizDemoIfMissing,
};
