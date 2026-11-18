/** Onboarding Checklist server — REST API over the app's SQLite DB. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapOnboardingTables, OnboardingRepository } from './onboarding-repository';
import { isChecklistComplete } from './onboarding-progress';
import type {
  Checklist,
  ChecklistTask,
  TaskStatus,
  UpsertChecklistInput,
  UpsertTaskInput,
} from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { onboardingDemoAdapter } from './db/seed-onboarding-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4119;

const StatusSchema = z.enum(['todo', 'doing', 'done']);

const ChecklistSchema = z.object({
  newHire: z.string().min(1),
  role: z.string().default(''),
  startDate: z.string().default(''),
});

const TaskSchema = z.object({
  checklistId: z.number().int().positive(),
  title: z.string().min(1),
  owner: z.string().default(''),
  dueDate: z.string().default(''),
  status: StatusSchema.default('todo'),
});

const TaskUpdateSchema = TaskSchema.omit({ checklistId: true });

const StatusOnlySchema = z.object({ status: StatusSchema });

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapOnboardingTables(db);
  runDemoSeedOnBoot(db, 'app-onboarding-checklist', onboardingDemoAdapter);
  const repo = new OnboardingRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-onboarding-checklist',
    healthExtras: () => ({ app: 'onboarding-checklist' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/onboarding', async () => ({ checklists: repo.list() }));

      server.post('/api/onboarding', async (request, reply) => {
        const parsed = ChecklistSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ checklist: repo.createChecklist(parsed.data as UpsertChecklistInput) });
      });

      server.delete('/api/onboarding/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteChecklist(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/onboarding-tasks', async (request, reply) => {
        const parsed = TaskSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ task: repo.addTask(parsed.data as UpsertTaskInput) });
      });

      server.patch('/api/onboarding-tasks/:id/status', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = StatusOnlySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const checklistBefore =
          repo.list().find((checklist) => checklist.tasks.some((row) => row.id === id)) ?? null;
        const task = repo.setTaskStatus(id, parsed.data.status as TaskStatus);
        if (!task) return reply.status(404).send({ error: 'Task not found' });

        // Evaluate the whole set after the write, then publish once — never per task in a batch.
        const checklistAfter = repo.list().find((checklist) => checklist.id === task.checklistId) ?? null;
        if (
          checklistBefore &&
          checklistAfter &&
          !isChecklistComplete(checklistBefore.tasks) &&
          isChecklistComplete(checklistAfter.tasks)
        ) {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-onboarding-checklist', 'onboarding', 'completed'),
              sourceAppId: 'app-onboarding-checklist',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                checklistId: checklistAfter.id,
                newHire: checklistAfter.newHire,
                role: checklistAfter.role,
                startDate: checklistAfter.startDate,
              },
            });
          } catch (publishError: unknown) {
            const logger = await VSCodeLogger.getInstance();
            logger.warn(
              `[onboarding-checklist] lab-events publish skipped: ${
                publishError instanceof Error ? publishError.message : String(publishError)
              }`,
            );
          }
        }

        return reply.send({ task });
      });

      server.delete('/api/onboarding-tasks/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteTask(id) ? 200 : 404).send({ success: true });
      });

      const parseChecklist = catalogZodParse(ChecklistSchema);
      const parseTask = catalogZodParse(TaskSchema);
      const parseTaskUpdate = catalogZodParse(TaskUpdateSchema);
      const flatTasks = (): ChecklistTask[] => repo.list().flatMap((checklist) => checklist.tasks);

      await registerCatalogConnectors(server, 'app-onboarding-checklist', {
        checklists: {
          list: () =>
            repo.list().map((row) => {
              const { tasks, ...checklist } = row;
              void tasks;
              return checklist;
            }),
          getById: (id) => {
            const numId = coerceConnectorNumericId(id);
            const row = repo.list().find((c) => c.id === numId);
            if (!row) return null;
            const { tasks, ...checklist } = row;
            void tasks;
            return checklist;
          },
          parseCreate: parseChecklist,
          parseUpdate: parseChecklist,
          create: (body) => repo.createChecklist(body as UpsertChecklistInput),
          update: (id, body) => repo.updateChecklist(coerceConnectorNumericId(id), body as UpsertChecklistInput),
          delete: (id) => repo.deleteChecklist(coerceConnectorNumericId(id)),
          toConnector: (checklist: Checklist) => ({ ...checklist }),
        },
        'onboarding-tasks': {
          list: flatTasks,
          getById: (id) => flatTasks().find((task) => task.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseTask,
          parseUpdate: parseTaskUpdate,
          create: (body) => repo.addTask(body as UpsertTaskInput),
          update: (id, body) => {
            const numId = coerceConnectorNumericId(id);
            const existing = flatTasks().find((task) => task.id === numId);
            if (!existing) return null;
            const data = parseTaskUpdate(body as Record<string, unknown>) as z.infer<typeof TaskUpdateSchema>;
            return repo.updateTask(numId, {
              checklistId: existing.checklistId,
              title: data.title,
              owner: data.owner,
              dueDate: data.dueDate,
              status: data.status as TaskStatus,
            });
          },
          delete: (id) => repo.deleteTask(coerceConnectorNumericId(id)),
          toConnector: (task: ChecklistTask) => ({
            id: task.id,
            checklistId: task.checklistId,
            title: task.title,
            owner: task.owner,
            dueDate: task.dueDate,
            status: task.status,
            order: task.order,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
