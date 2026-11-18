/**
 * Training & Quizzes data layer — quizzes, questions, and scored attempts.
 */
import type { Database } from 'better-sqlite3';
import { DateTime } from 'luxon';
import { demoCastNameForId } from '@/shared/config/demo-data-cast';
import { columnExists, ensureTextColumn } from '@/shared/server/demo-seed-columns';
import { CATEGORY_CERT_DEFINITIONS } from '@/shared/training-quizzes/category-cert-definitions';
import type {
  CategoryCertDefinitionRow,
  CategoryCertProgress,
  CertificationStatus,
  LearnerCertification,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  QuizWithQuestions,
  SubmitAttemptInput,
  TrainingCertBadge,
  UpsertCertificationInput,
  UpsertQuestionInput,
  UpsertQuizInput,
} from '../shared/types';

interface QuizRow {
  id: number;
  title: string;
  category: string;
  description: string;
  passing_score: number;
  created_at: string;
}

interface QuestionRow {
  id: number;
  quiz_id: number;
  prompt: string;
  options_json: string;
  correct_index: number;
  order: number;
}

interface AttemptRow {
  id: number;
  quiz_id: number;
  learner: string;
  /** Added by the phase-31 person-column migration; NULL on older rows. */
  learner_id?: number | null;
  score: number;
  passed: number;
  created_at: string;
}

interface CertificationRow {
  id: number;
  category: string;
  quiz_id: number | null;
  learner: string;
  learner_id?: number | null;
  title: string;
  expires_at: string;
  status: string;
  issued_at: string;
}

interface CertDefinitionRow {
  category: string;
  title: string;
  icon: string;
  description: string;
}

export function syncCategoryCertificationDefinitions(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_certification_definitions (
      category TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );
  `);
  const upsert = db.prepare(`
    INSERT INTO category_certification_definitions (category, title, icon, description)
    VALUES (@category, @title, @icon, @description)
    ON CONFLICT(category) DO UPDATE SET
      title = excluded.title,
      icon = excluded.icon,
      description = excluded.description
  `);
  for (const def of CATEGORY_CERT_DEFINITIONS) {
    upsert.run(def);
  }
  const keep = CATEGORY_CERT_DEFINITIONS.map((row) => row.category);
  if (keep.length > 0) {
    db.prepare(
      `DELETE FROM category_certification_definitions WHERE category NOT IN (${keep.map(() => '?').join(', ')})`,
    ).run(...keep);
  }
}

export function bootstrapQuizTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      passing_score INTEGER NOT NULL DEFAULT 70,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_index INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      learner TEXT NOT NULL DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions (quiz_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts (quiz_id);
    CREATE TABLE IF NOT EXISTS learner_certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT '',
      quiz_id INTEGER,
      learner TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      expires_at TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      issued_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  if (!columnExists(db, 'learner_certifications', 'learner_id')) {
    db.exec(`ALTER TABLE learner_certifications ADD COLUMN learner_id INTEGER`);
  }
  ensureTextColumn(db, 'quizzes', 'category');
  ensureTextColumn(db, 'learner_certifications', 'category');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learner_certifications_category ON learner_certifications (category);
  `);
  syncCategoryCertificationDefinitions(db);
}

function mapQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? '',
    description: row.description,
    passingScore: row.passing_score,
    createdAt: row.created_at,
  };
}

function mapQuestion(row: QuestionRow): QuizQuestion {
  let options: string[] = [];
  try {
    options = JSON.parse(row.options_json) as string[];
  } catch {
    options = [];
  }
  return {
    id: row.id,
    quizId: row.quiz_id,
    prompt: row.prompt,
    options,
    correctIndex: row.correct_index,
    order: row.order,
  };
}

function mapCertification(row: CertificationRow): LearnerCertification {
  return {
    id: row.id,
    category: row.category ?? '',
    quizId: row.quiz_id,
    learner: row.learner,
    learnerId: row.learner_id ?? null,
    title: row.title,
    expiresAt: row.expires_at,
    status: row.status as CertificationStatus,
    issuedAt: row.issued_at,
  };
}

function mapCertDefinition(row: CertDefinitionRow): CategoryCertDefinitionRow {
  return {
    category: row.category,
    title: row.title,
    icon: row.icon,
    description: row.description,
  };
}

function learnerMatchSql(alias: string): string {
  return `(${alias}.learner_id = @learnerId OR (@learnerId IS NULL AND ${alias}.learner = @learner))`;
}

function mapAttempt(row: AttemptRow): QuizAttempt {
  return {
    id: row.id,
    quizId: row.quiz_id,
    learner: row.learner,
    learnerId: row.learner_id ?? null,
    score: row.score,
    passed: row.passed === 1,
    createdAt: row.created_at,
  };
}

export class QuizRepository {
  constructor(private readonly db: Database) {}

  listQuizzes(): QuizWithQuestions[] {
    const quizzes = this.db
      .prepare(`SELECT * FROM quizzes ORDER BY category ASC, title ASC, id ASC`)
      .all() as QuizRow[];
    const byQuiz = new Map<number, QuizQuestion[]>();
    for (const row of this.db
      .prepare(`SELECT * FROM quiz_questions ORDER BY "order" ASC, id ASC`)
      .all() as QuestionRow[]) {
      const q = mapQuestion(row);
      const list = byQuiz.get(q.quizId) ?? [];
      list.push(q);
      byQuiz.set(q.quizId, list);
    }
    return quizzes.map((quiz) => ({ ...mapQuiz(quiz), questions: byQuiz.get(quiz.id) ?? [] }));
  }

  listAttempts(quizId: number): QuizAttempt[] {
    return (
      this.db
        .prepare(`SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY created_at DESC, id DESC`)
        .all(quizId) as AttemptRow[]
    ).map(mapAttempt);
  }

  createQuiz(input: UpsertQuizInput): Quiz {
    const info = this.db
      .prepare(`INSERT INTO quizzes (title, category, description, passing_score) VALUES (?, ?, ?, ?)`)
      .run(input.title.trim(), (input.category ?? '').trim(), input.description.trim(), input.passingScore);
    return mapQuiz(this.db.prepare(`SELECT * FROM quizzes WHERE id = ?`).get(info.lastInsertRowid) as QuizRow);
  }

  updateQuiz(id: number, input: UpsertQuizInput): Quiz | null {
    if (!this.db.prepare(`SELECT id FROM quizzes WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(`UPDATE quizzes SET title = ?, category = ?, description = ?, passing_score = ? WHERE id = ?`)
      .run(input.title.trim(), (input.category ?? '').trim(), input.description.trim(), input.passingScore, id);
    return mapQuiz(this.db.prepare(`SELECT * FROM quizzes WHERE id = ?`).get(id) as QuizRow);
  }

  deleteQuiz(id: number): boolean {
    this.db.prepare(`DELETE FROM quiz_questions WHERE quiz_id = ?`).run(id);
    this.db.prepare(`DELETE FROM quiz_attempts WHERE quiz_id = ?`).run(id);
    return this.db.prepare(`DELETE FROM quizzes WHERE id = ?`).run(id).changes > 0;
  }

  listCertificationDefinitions(): CategoryCertDefinitionRow[] {
    return (
      this.db
        .prepare(
          `SELECT category, title, icon, description FROM category_certification_definitions ORDER BY category ASC`,
        )
        .all() as CertDefinitionRow[]
    ).map(mapCertDefinition);
  }

  listCertifications(): LearnerCertification[] {
    return (
      this.db
        .prepare(`SELECT * FROM learner_certifications ORDER BY expires_at ASC, id ASC`)
        .all() as CertificationRow[]
    ).map(mapCertification);
  }

  createCertification(input: UpsertCertificationInput): LearnerCertification {
    const info = this.db
      .prepare(
        `INSERT INTO learner_certifications (category, quiz_id, learner, learner_id, title, expires_at, status) VALUES (?, NULL, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.category.trim(),
        input.learner.trim(),
        input.learnerId ?? null,
        input.title.trim(),
        input.expiresAt.trim(),
        input.status,
      );
    return mapCertification(
      this.db.prepare(`SELECT * FROM learner_certifications WHERE id = ?`).get(info.lastInsertRowid) as CertificationRow,
    );
  }

  updateCertification(id: number, input: UpsertCertificationInput): LearnerCertification | null {
    if (!this.db.prepare(`SELECT id FROM learner_certifications WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE learner_certifications SET category = ?, learner = ?, learner_id = ?, title = ?, expires_at = ?, status = ? WHERE id = ?`,
      )
      .run(
        input.category.trim(),
        input.learner.trim(),
        input.learnerId ?? null,
        input.title.trim(),
        input.expiresAt.trim(),
        input.status,
        id,
      );
    return mapCertification(
      this.db.prepare(`SELECT * FROM learner_certifications WHERE id = ?`).get(id) as CertificationRow,
    );
  }

  deleteCertification(id: number): boolean {
    return this.db.prepare(`DELETE FROM learner_certifications WHERE id = ?`).run(id).changes > 0;
  }

  countPassedQuizzesInCategory(
    category: string,
    learner: string,
    learnerId: number | null | undefined,
  ): { total: number; passed: number } {
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS n FROM quizzes WHERE category = ?`)
      .get(category.trim()) as { n: number };
    const total = totalRow?.n ?? 0;
    if (total === 0) {
      return { total: 0, passed: 0 };
    }
    const passedRow = this.db
      .prepare(
        `SELECT COUNT(DISTINCT q.id) AS n
         FROM quizzes q
         INNER JOIN quiz_attempts a ON a.quiz_id = q.id AND a.passed = 1
         WHERE q.category = ? AND ${learnerMatchSql('a')}`,
      )
      .get({ category: category.trim(), learner: learner.trim(), learnerId: learnerId ?? null }) as {
      n: number;
    };
    return { total, passed: passedRow?.n ?? 0 };
  }

  activeCertificationForCategory(
    category: string,
    learner: string,
    learnerId: number | null | undefined,
  ): LearnerCertification | null {
    const row = this.db
      .prepare(
        `SELECT * FROM learner_certifications
         WHERE category = ? AND status = 'active' AND ${learnerMatchSql('learner_certifications')}
         ORDER BY id DESC LIMIT 1`,
      )
      .get({ category: category.trim(), learner: learner.trim(), learnerId: learnerId ?? null }) as
      | CertificationRow
      | undefined;
    return row ? mapCertification(row) : null;
  }

  listCategoryProgress(learner: string, learnerId: number | null | undefined): CategoryCertProgress[] {
    const definitions = this.listCertificationDefinitions();
    return definitions.map((definition) => {
      const { total, passed } = this.countPassedQuizzesInCategory(
        definition.category,
        learner,
        learnerId,
      );
      const certification = this.activeCertificationForCategory(
        definition.category,
        learner,
        learnerId,
      );
      return {
        category: definition.category,
        totalQuizzes: total,
        passedQuizzes: passed,
        earned: certification != null,
        definition,
        certification,
      };
    });
  }

  /**
   * Issue or renew a category certification when every quiz in the category has a passing attempt.
   */
  maybeIssueCategoryCertification(params: {
    category: string;
    learner: string;
    learnerId?: number | null;
    passedAtIso: string;
  }): LearnerCertification | null {
    const category = params.category.trim();
    if (!category) return null;
    const { total, passed } = this.countPassedQuizzesInCategory(
      category,
      params.learner,
      params.learnerId,
    );
    if (total === 0 || passed < total) {
      return null;
    }
    const definition =
      this.listCertificationDefinitions().find((row) => row.category === category) ??
      CATEGORY_CERT_DEFINITIONS.find((row) => row.category === category);
    if (!definition) return null;

    const passDay =
      DateTime.fromISO(params.passedAtIso, { zone: 'utc' }).toISODate() ??
      DateTime.utc().toISODate() ??
      '';
    const expiresAt =
      DateTime.fromISO(passDay, { zone: 'utc' }).plus({ years: 1 }).toISODate() ?? passDay;

    const existing = this.activeCertificationForCategory(
      category,
      params.learner,
      params.learnerId,
    );
    if (existing) {
      this.db
        .prepare(
          `UPDATE learner_certifications SET learner_id = ?, title = ?, expires_at = ?, issued_at = ? WHERE id = ?`,
        )
        .run(
          params.learnerId ?? null,
          definition.title,
          expiresAt,
          params.passedAtIso,
          existing.id,
        );
      return mapCertification(
        this.db.prepare(`SELECT * FROM learner_certifications WHERE id = ?`).get(existing.id) as CertificationRow,
      );
    }
    return this.createCertification({
      category,
      learner: params.learner,
      learnerId: params.learnerId,
      title: definition.title,
      expiresAt,
      status: 'active',
    });
  }

  listActiveCertBadgesForUserIds(userIds: number[]): Record<number, TrainingCertBadge[]> {
    if (userIds.length === 0) return {};
    const idPlaceholders = userIds.map(() => '?').join(',');
    const learnerNames = [
      ...new Set(
        userIds
          .map((id) => demoCastNameForId(id))
          .filter((name): name is string => typeof name === 'string' && name.length > 0),
      ),
    ];
    const nameClause =
      learnerNames.length > 0
        ? ` OR c.learner IN (${learnerNames.map(() => '?').join(', ')})`
        : '';
    const rows = this.db
      .prepare(
        `SELECT c.learner_id, c.learner, c.category, c.title, d.icon
         FROM learner_certifications c
         LEFT JOIN category_certification_definitions d ON d.category = c.category
         WHERE c.status = 'active'
           AND (c.learner_id IN (${idPlaceholders})${nameClause})
         ORDER BY c.category ASC`,
      )
      .all(...userIds, ...learnerNames) as Array<{
      learner_id: number | null;
      learner: string;
      category: string;
      title: string;
      icon: string | null;
    }>;
    const out: Record<number, TrainingCertBadge[]> = {};
    for (const row of rows) {
      let userId = row.learner_id ?? null;
      if (userId == null || !userIds.includes(userId)) {
        const byName = userIds.find((id) => demoCastNameForId(id) === row.learner.trim());
        userId = byName ?? null;
      }
      if (userId == null || !userIds.includes(userId)) {
        continue;
      }
      const list = out[userId] ?? [];
      list.push({
        category: row.category,
        title: row.title,
        icon: row.icon ?? 'pi pi-verified',
      });
      out[userId] = list;
    }
    return out;
  }

  addQuestion(input: UpsertQuestionInput): QuizQuestion {
    const nextOrder =
      (
        this.db
          .prepare(`SELECT COALESCE(MAX("order"), -1) + 1 AS n FROM quiz_questions WHERE quiz_id = ?`)
          .get(input.quizId) as { n: number }
      ).n ?? 0;
    const info = this.db
      .prepare(
        `INSERT INTO quiz_questions (quiz_id, prompt, options_json, correct_index, "order") VALUES (?, ?, ?, ?, ?)`,
      )
      .run(input.quizId, input.prompt.trim(), JSON.stringify(input.options), input.correctIndex, nextOrder);
    return mapQuestion(this.db.prepare(`SELECT * FROM quiz_questions WHERE id = ?`).get(info.lastInsertRowid) as QuestionRow);
  }

  updateQuestion(id: number, input: UpsertQuestionInput): QuizQuestion | null {
    if (!this.db.prepare(`SELECT id FROM quiz_questions WHERE id = ?`).get(id)) return null;
    this.db
      .prepare(
        `UPDATE quiz_questions SET quiz_id = ?, prompt = ?, options_json = ?, correct_index = ? WHERE id = ?`,
      )
      .run(input.quizId, input.prompt.trim(), JSON.stringify(input.options), input.correctIndex, id);
    return mapQuestion(this.db.prepare(`SELECT * FROM quiz_questions WHERE id = ?`).get(id) as QuestionRow);
  }

  deleteQuestion(id: number): boolean {
    return this.db.prepare(`DELETE FROM quiz_questions WHERE id = ?`).run(id).changes > 0;
  }

  /** Grade answers against the quiz's questions; persist + return the attempt. */
  submitAttempt(input: SubmitAttemptInput): QuizAttempt {
    const quiz = this.db.prepare(`SELECT * FROM quizzes WHERE id = ?`).get(input.quizId) as QuizRow | undefined;
    if (!quiz) {
      throw new Error(`Quiz ${input.quizId} not found`);
    }
    const questions = (
      this.db
        .prepare(`SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY "order" ASC, id ASC`)
        .all(input.quizId) as QuestionRow[]
    ).map(mapQuestion);
    const total = questions.length;
    let correct = 0;
    questions.forEach((q, i) => {
      if (input.answers[i] === q.correctIndex) correct += 1;
    });
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = score >= quiz.passing_score;
    const info = this.db
      .prepare(
        `INSERT INTO quiz_attempts (quiz_id, learner, learner_id, score, passed) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(input.quizId, input.learner.trim(), input.learnerId ?? null, score, passed ? 1 : 0);
    return mapAttempt(this.db.prepare(`SELECT * FROM quiz_attempts WHERE id = ?`).get(info.lastInsertRowid) as AttemptRow);
  }
}
