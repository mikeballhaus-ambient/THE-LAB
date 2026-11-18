import { catalogAppRequest } from '@/shared/apps/catalog-app-request';
import type { CategoryCertProgress, QuizAttempt, QuizWithQuestions, LearnerCertification } from '../shared/types';

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  return catalogAppRequest<T>(base, path, 'QUIZ', init);
}

export const listQuizzes = (base: string): Promise<QuizWithQuestions[]> =>
  request<{ quizzes: QuizWithQuestions[] }>(base, '/api/quizzes').then((body) => body.quizzes ?? []);

export const listAttempts = (base: string, quizId: number): Promise<QuizAttempt[]> =>
  request<{ attempts: QuizAttempt[] }>(base, `/api/quizzes/${quizId}/attempts`).then(
    (body) => body.attempts ?? [],
  );

export const fetchCategoryProgress = (
  base: string,
  learner: string,
  learnerId?: number | null,
): Promise<CategoryCertProgress[]> => {
  const params = new URLSearchParams({ learner });
  if (learnerId != null && Number.isFinite(learnerId)) {
    params.set('learnerId', String(learnerId));
  }
  return request<{ progress: CategoryCertProgress[] }>(
    base,
    `/api/category-progress?${params.toString()}`,
  ).then((body) => body.progress ?? []);
};

/** Submit answers and receive the scored attempt (and optional category certification). */
export const submitAttempt = (
  base: string,
  quizId: number,
  learner: string,
  answers: number[],
  learnerId?: number | null,
): Promise<{ attempt: QuizAttempt; categoryCertIssued: LearnerCertification | null }> =>
  request<{ attempt: QuizAttempt; categoryCertIssued: LearnerCertification | null }>(
    base,
    '/api/quiz-attempts',
    {
      method: 'POST',
      body: JSON.stringify({ quizId, learner, answers, learnerId: learnerId ?? undefined }),
    },
  );

export const deleteQuiz = (base: string, id: number): Promise<void> =>
  request(base, `/api/quizzes/${id}`, { method: 'DELETE' }).then(() => undefined);
