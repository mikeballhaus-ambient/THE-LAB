import type { Database } from 'better-sqlite3';
import { AppDatabaseManager } from '@/backend/AppDatabaseManager';
import {
  bootstrapQuizTables,
  QuizRepository,
} from '@/apps/training-quizzes/back-end/quiz-repository';
import { quizDemoAdapter } from '@/apps/training-quizzes/back-end/db/seed-quiz-demo';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import type { TrainingCertBadge } from '@/apps/training-quizzes/shared/types';
import { resolveAppDatabaseFolderId } from '@/backend/platform/app-seed-data-db-id';

const TRAINING_QUIZZES_REGISTRY_APP_ID = 'app-training-quizzes';

let tablesBootstrapped = false;

async function withQuizRepository(
  run: (repo: QuizRepository) => TrainingCertBadge[] | Record<number, TrainingCertBadge[]>,
): Promise<ReturnType<typeof run>> {
  const db = await AppDatabaseManager.getInstance().getConnection(
    resolveAppDatabaseFolderId(TRAINING_QUIZZES_REGISTRY_APP_ID),
  );
  if (!tablesBootstrapped) {
    bootstrapQuizTables(db);
    runDemoSeedOnBoot(db, 'app-training-quizzes', quizDemoAdapter);
    tablesBootstrapped = true;
  }
  const repo = new QuizRepository(db);
  return run(repo);
}

export async function fetchTrainingCertBadgesByUserIds(
  userIds: number[],
): Promise<Record<number, TrainingCertBadge[]>> {
  const unique = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) {
    return {};
  }
  try {
    return (await withQuizRepository((repo) => repo.listActiveCertBadgesForUserIds(unique))) as Record<
      number,
      TrainingCertBadge[]
    >;
  } catch {
    return {};
  }
}

/** For tests and direct DB access without AppDatabaseManager. */
export function listTrainingCertBadgesForUserIds(
  db: Database,
  userIds: number[],
): Record<number, TrainingCertBadge[]> {
  bootstrapQuizTables(db);
  return new QuizRepository(db).listActiveCertBadgesForUserIds(userIds);
}
