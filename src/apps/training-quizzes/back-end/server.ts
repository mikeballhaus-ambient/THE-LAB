/** Training & Quizzes server — REST API over the app's SQLite DB. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { grantLabActivityQuarkReward } from '@/shared/server/grant-lab-activity-quark-reward.node';
import { labActivityQuarkSourceRef } from '@/shared/types/lab-virtual-bank';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapQuizTables, QuizRepository } from './quiz-repository';
import type {
  LearnerCertification,
  Quiz,
  QuizQuestion,
  SubmitAttemptInput,
  UpsertCertificationInput,
  UpsertQuestionInput,
  UpsertQuizInput,
} from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { quizDemoAdapter } from './db/seed-quiz-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4118;

const QuizSchema = z.object({
  title: z.string().min(1),
  category: z.string().default(''),
  description: z.string().default(''),
  passingScore: z.number().int().min(0).max(100).default(70),
});

const QuestionSchema = z.object({
  quizId: z.number().int().positive(),
  prompt: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
});

const QuestionConnectorSchema = z.object({
  quizId: z.number().int().positive(),
  prompt: z.string().min(1),
  options: z.union([z.string(), z.array(z.string())]),
  correctIndex: z.number().int().min(0),
  order: z.number().int().optional(),
});

function parseQuestionConnectorBody(body: Record<string, unknown>): UpsertQuestionInput {
  const parsed = QuestionConnectorSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  const options =
    typeof parsed.data.options === 'string'
      ? (JSON.parse(parsed.data.options) as string[])
      : parsed.data.options;
  return {
    quizId: parsed.data.quizId,
    prompt: parsed.data.prompt,
    options,
    correctIndex: parsed.data.correctIndex,
  };
}

const AttemptSchema = z.object({
  quizId: z.number().int().positive(),
  learner: z.string().default(''),
  learnerId: z.number().int().positive().optional(),
  answers: z.array(z.number().int()),
});

const CertificationStatusSchema = z.enum(['active', 'revoked']);

const CertificationSchema = z.object({
  category: z.string().min(1),
  learner: z.string().default(''),
  title: z.string().min(1),
  expiresAt: z.string().min(1),
  status: CertificationStatusSchema.default('active'),
});

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapQuizTables(db);
  runDemoSeedOnBoot(db, 'app-training-quizzes', quizDemoAdapter);
  const repo = new QuizRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-training-quizzes',
    healthExtras: () => ({ app: 'training-quizzes' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {
      server.get('/api/quizzes', async () => ({ quizzes: repo.listQuizzes() }));

      server.get('/api/quizzes/:id/attempts', async (request) => ({
        attempts: repo.listAttempts(Number((request.params as { id: string }).id)),
      }));

      server.get('/api/category-progress', async (request) => {
        const q = request.query as { learner?: string; learnerId?: string };
        const learnerIdRaw = q.learnerId?.trim();
        const learnerId =
          learnerIdRaw != null && learnerIdRaw !== ''
            ? Number.parseInt(learnerIdRaw, 10)
            : undefined;
        let actorId: number | null = null;
        try {
          actorId = resolveLabAppActorUserId(request);
        } catch {
          actorId = null;
        }
        const learner = (q.learner ?? '').trim();
        const resolvedLearnerId =
          learnerId != null && Number.isFinite(learnerId) ? learnerId : actorId;
        return {
          progress: repo.listCategoryProgress(learner, resolvedLearnerId ?? null),
        };
      });

      server.get('/api/certifications/badges', async (request) => {
        const q = request.query as { userIds?: string };
        const userIds = (q.userIds ?? '')
          .split(',')
          .map((part) => Number.parseInt(part.trim(), 10))
          .filter((id) => Number.isFinite(id) && id > 0);
        return { badges: repo.listActiveCertBadgesForUserIds(userIds) };
      });

      server.post('/api/quizzes', async (request, reply) => {
        const parsed = QuizSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ quiz: repo.createQuiz(parsed.data as UpsertQuizInput) });
      });

      server.delete('/api/quizzes/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteQuiz(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/quiz-questions', async (request, reply) => {
        const parsed = QuestionSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        if (parsed.data.correctIndex >= parsed.data.options.length) {
          return reply.status(400).send({ error: 'correctIndex out of range' });
        }
        return reply.send({ question: repo.addQuestion(parsed.data as UpsertQuestionInput) });
      });

      server.delete('/api/quiz-questions/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteQuestion(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/quiz-attempts', async (request, reply) => {
        const parsed = AttemptSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        try {
          const attempt = repo.submitAttempt(parsed.data as SubmitAttemptInput);
          let categoryCertIssued = null;
          let quarksRewarded = 0;

          // A failed attempt is a legitimate record but not a pass — only the pass publishes.
          if (attempt.passed) {
            const quiz = repo.listQuizzes().find((row) => row.id === attempt.quizId) ?? null;
            if (quiz?.category) {
              categoryCertIssued = repo.maybeIssueCategoryCertification({
                category: quiz.category,
                learner: attempt.learner,
                learnerId: attempt.learnerId,
                passedAtIso: attempt.createdAt,
              });
            }
            try {
              await publishLabDomainEvent(request, {
                schemaVersion: 1,
                id: randomUUID(),
                type: buildLabEventType('app-training-quizzes', 'quiz', 'passed'),
                sourceAppId: 'app-training-quizzes',
                occurredAt: new Date().toISOString(),
                actorUserId: resolveLabAppActorUserId(request),
                payload: {
                  quizId: attempt.quizId,
                  title: quiz?.title ?? '',
                  category: quiz?.category ?? '',
                  learner: attempt.learner,
                  learnerId: attempt.learnerId ?? null,
                  score: attempt.score,
                  passed: attempt.passed,
                  categoryCertIssued: categoryCertIssued != null,
                },
              });
            } catch (publishError: unknown) {
              const logger = await VSCodeLogger.getInstance();
              logger.warn(
                `[training-quizzes] lab-events publish skipped: ${
                  publishError instanceof Error ? publishError.message : String(publishError)
                }`,
              );
            }

            const learnerUserId = attempt.learnerId ?? resolveLabAppActorUserId(request);
            if (learnerUserId != null) {
              quarksRewarded = await grantLabActivityQuarkReward({
                kind: 'quizPass',
                userId: learnerUserId,
                sourceAppId: 'app-training-quizzes',
                sourceRef: labActivityQuarkSourceRef('quizPass', {
                  quizId: attempt.quizId,
                  userId: learnerUserId,
                }),
                reasonLabel: quiz?.title ? `Quiz passed — ${quiz.title}` : 'Training quiz passed',
              });
            }
          }

          return reply.send({ attempt, categoryCertIssued, quarksRewarded });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Quiz not found';
          return reply.status(404).send({ error: message });
        }
      });

      const parseQuiz = catalogZodParse(QuizSchema);
      const parseCertification = catalogZodParse(CertificationSchema);
      const flatQuestions = (): QuizQuestion[] =>
        repo.listQuizzes().flatMap((quiz) => quiz.questions);

      await registerCatalogConnectors(server, 'app-training-quizzes', {
        quizzes: {
          list: () =>
            repo.listQuizzes().map((row) => {
              const { questions, ...quiz } = row;
              void questions;
              return quiz;
            }),
          getById: (id) => {
            const numId = coerceConnectorNumericId(id);
            const row = repo.listQuizzes().find((q) => q.id === numId);
            if (!row) return null;
            const { questions, ...quiz } = row;
            void questions;
            return quiz;
          },
          parseCreate: parseQuiz,
          parseUpdate: parseQuiz,
          create: (body) => repo.createQuiz(body as UpsertQuizInput),
          update: (id, body) => repo.updateQuiz(coerceConnectorNumericId(id), body as UpsertQuizInput),
          delete: (id) => repo.deleteQuiz(coerceConnectorNumericId(id)),
          toConnector: (quiz: Quiz) => ({ ...quiz }),
        },
        'quiz-questions': {
          list: flatQuestions,
          getById: (id) => flatQuestions().find((question) => question.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseQuestionConnectorBody,
          parseUpdate: parseQuestionConnectorBody,
          create: (body) => repo.addQuestion(body as UpsertQuestionInput),
          update: (id, body) => {
            const numId = coerceConnectorNumericId(id);
            const existing = flatQuestions().find((question) => question.id === numId);
            if (!existing) return null;
            const input = parseQuestionConnectorBody({
              ...(body as Record<string, unknown>),
              quizId: existing.quizId,
            });
            return repo.updateQuestion(numId, input);
          },
          delete: (id) => repo.deleteQuestion(coerceConnectorNumericId(id)),
          toConnector: (question: QuizQuestion) => ({
            id: question.id,
            quizId: question.quizId,
            prompt: question.prompt,
            options: JSON.stringify(question.options),
            correctIndex: question.correctIndex,
            order: question.order,
          }),
        },
        certifications: {
          list: () => repo.listCertifications(),
          getById: (id) => repo.listCertifications().find((row) => row.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseCertification,
          parseUpdate: parseCertification,
          create: (body) => repo.createCertification(body as UpsertCertificationInput),
          update: (id, body) => repo.updateCertification(coerceConnectorNumericId(id), body as UpsertCertificationInput),
          delete: (id) => repo.deleteCertification(coerceConnectorNumericId(id)),
          toConnector: (cert: LearnerCertification) => ({
            id: cert.id,
            category: cert.category,
            quizId: cert.quizId,
            learner: cert.learner,
            title: cert.title,
            expiresAt: cert.expiresAt,
            status: cert.status,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
