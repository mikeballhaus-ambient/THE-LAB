export interface Quiz {
  id: number;
  title: string;
  /** Topic group — aligns with About THE-LAB nav and KB categories in demo seeds. */
  category: string;
  description: string;
  /** Minimum score (0–100) required to pass. */
  passingScore: number;
  createdAt: string;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  order: number;
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  learner: string;
  /** Platform user id for the learner (phase 31, non-entity table). */
  learnerId?: number | null;
  score: number;
  passed: boolean;
  createdAt: string;
}

/** Quiz with its questions and scored attempts. */
export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

export interface UpsertQuizInput {
  title: string;
  category: string;
  description: string;
  passingScore: number;
}

export interface UpsertQuestionInput {
  quizId: number;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface SubmitAttemptInput {
  quizId: number;
  learner: string;
  learnerId?: number | null;
  /** Selected option index per question, in question order. */
  answers: number[];
}

export type CertificationStatus = 'active' | 'revoked';

export interface CategoryCertDefinitionRow {
  category: string;
  title: string;
  icon: string;
  description: string;
}

export interface CategoryCertProgress {
  category: string;
  totalQuizzes: number;
  passedQuizzes: number;
  earned: boolean;
  definition: CategoryCertDefinitionRow;
  certification: LearnerCertification | null;
}

export interface LearnerCertification {
  id: number;
  /** Category track — earn by passing all quizzes in the category. */
  category: string;
  quizId: number | null;
  learner: string;
  learnerId?: number | null;
  title: string;
  expiresAt: string;
  status: CertificationStatus;
  issuedAt: string;
}

export interface UpsertCertificationInput {
  category: string;
  learner: string;
  learnerId?: number | null;
  title: string;
  expiresAt: string;
  status: CertificationStatus;
}

/** Active category badges for lab messaging (platform user id). */
export interface TrainingCertBadge {
  category: string;
  title: string;
  icon: string;
}
