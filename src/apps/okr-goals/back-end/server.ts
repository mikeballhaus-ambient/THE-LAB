/**
 * OKR / Goals server — REST API over the app's SQLite DB.
 * Objectives + key results; progress is derived server-side.
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapOkrTables, OkrRepository } from './okr-repository';
import { isObjectiveComplete } from './objective-progress';
import type {
  KeyResult,
  KeyResultStatus,
  Objective,
  UpsertKeyResultInput,
  UpsertObjectiveInput,
} from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { okrGoalsDemoAdapter } from './db/seed-okr-goals-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4110;

const StatusSchema = z.enum(['not-started', 'on-track', 'at-risk', 'done']);

const ObjectiveSchema = z.object({
  title: z.string().min(1),
  ownerName: z.string().default(''),
  quarter: z.string().default(''),
});

const KeyResultSchema = z.object({
  objectiveId: z.number().int().positive(),
  title: z.string().min(1),
  metric: z.string().default(''),
  baseline: z.number(),
  target: z.number(),
  current: z.number().default(0),
  status: StatusSchema.default('not-started'),
});

const KeyResultUpdateSchema = KeyResultSchema.omit({ objectiveId: true });

async function discardPublishError(publishError: unknown): Promise<void> {
  const logger = await VSCodeLogger.getInstance();
  logger.warn(
    `[okr-goals] lab-events publish skipped: ${
      publishError instanceof Error ? publishError.message : String(publishError)
    }`,
  );
}

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapOkrTables(db);
  runDemoSeedOnBoot(db, 'app-okr-goals', okrGoalsDemoAdapter);
  const repo = new OkrRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-okr-goals',
    healthExtras: () => ({ app: 'okr-goals' }),
    onSocketConnection: () => {
      /* REST-driven app; socket connection kept for platform parity. */
    },
    registerRoutes: async (server) => {
      server.get('/api/okr/objectives', async () => ({ objectives: repo.listObjectives() }));

      server.post('/api/okr/objectives', async (request, reply) => {
        const parsed = ObjectiveSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: parsed.error.message });
        }
        return reply.send({ objective: repo.createObjective(parsed.data as UpsertObjectiveInput) });
      });

      server.put('/api/okr/objectives/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = ObjectiveSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: parsed.error.message });
        }
        const objective = repo.updateObjective(id, parsed.data as UpsertObjectiveInput);
        if (!objective) {
          return reply.status(404).send({ error: 'Objective not found' });
        }
        return reply.send({ objective });
      });

      server.delete('/api/okr/objectives/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const deleted = repo.deleteObjective(id);
        return reply.status(deleted ? 200 : 404).send({ success: deleted });
      });

      server.post('/api/okr/key-results', async (request, reply) => {
        const parsed = KeyResultSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: parsed.error.message });
        }
        return reply.send({ keyResult: repo.createKeyResult(parsed.data as UpsertKeyResultInput) });
      });

      server.put('/api/okr/key-results/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = KeyResultUpdateSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({ error: parsed.error.message });
        }
        const data = parsed.data;
        const objectivesBefore = repo.listObjectives();
        const previousKeyResult =
          objectivesBefore.flatMap((objective) => objective.keyResults).find((kr) => kr.id === id) ?? null;
        const previousObjective =
          objectivesBefore.find((objective) => objective.id === previousKeyResult?.objectiveId) ?? null;

        const keyResult = repo.updateKeyResult(id, {
          objectiveId: 0,
          title: data.title,
          metric: data.metric,
          baseline: data.baseline,
          target: data.target,
          current: data.current,
          status: data.status as KeyResultStatus,
        });
        if (!keyResult) {
          return reply.status(404).send({ error: 'Key result not found' });
        }

        // Publish on entry to a value, never on every save.
        if (previousKeyResult?.status !== keyResult.status && keyResult.status === 'at-risk') {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-okr-goals', 'key-result', 'at_risk'),
              sourceAppId: 'app-okr-goals',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                keyResultId: keyResult.id,
                objectiveId: keyResult.objectiveId,
                title: keyResult.title,
                status: keyResult.status,
                current: keyResult.current,
                target: keyResult.target,
              },
            });
          } catch (publishError: unknown) {
            await discardPublishError(publishError);
          }
        }

        const objectiveAfter = repo
          .listObjectives()
          .find((objective) => objective.id === keyResult.objectiveId);
        if (
          previousObjective &&
          objectiveAfter &&
          !isObjectiveComplete(previousObjective.keyResults) &&
          isObjectiveComplete(objectiveAfter.keyResults)
        ) {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-okr-goals', 'objective', 'completed'),
              sourceAppId: 'app-okr-goals',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                objectiveId: objectiveAfter.id,
                title: objectiveAfter.title,
                quarter: objectiveAfter.quarter,
                ownerName: objectiveAfter.ownerName,
              },
            });
          } catch (publishError: unknown) {
            await discardPublishError(publishError);
          }
        }

        return reply.send({ keyResult });
      });

      server.delete('/api/okr/key-results/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const deleted = repo.deleteKeyResult(id);
        return reply.status(deleted ? 200 : 404).send({ success: deleted });
      });

      const parseObjective = catalogZodParse(ObjectiveSchema);
      const toObjectiveConnector = (objective: Objective) => ({
        id: objective.id,
        title: objective.title,
        ownerName: objective.ownerName,
        quarter: objective.quarter,
        createdAt: objective.createdAt,
      });

      const parseKeyResult = catalogZodParse(KeyResultSchema);
      const parseKeyResultUpdate = catalogZodParse(KeyResultUpdateSchema);
      const flatKeyResults = (): KeyResult[] =>
        repo.listObjectives().flatMap((objective) => objective.keyResults);
      const toKeyResultConnector = (keyResult: KeyResult) => ({
        id: keyResult.id,
        objectiveId: keyResult.objectiveId,
        title: keyResult.title,
        metric: keyResult.metric,
        baseline: keyResult.baseline,
        target: keyResult.target,
        current: keyResult.current,
        status: keyResult.status,
      });

      await registerCatalogConnectors(server, 'app-okr-goals', {
        objectives: {
          list: () => repo.listObjectives().map(toObjectiveConnector),
          getById: (id) => {
            const numId = coerceConnectorNumericId(id);
            const row = repo.listObjectives().find((o) => o.id === numId);
            return row ? toObjectiveConnector(row) : null;
          },
          parseCreate: parseObjective,
          parseUpdate: parseObjective,
          create: (body) => repo.createObjective(body as UpsertObjectiveInput),
          update: (id, body) => repo.updateObjective(coerceConnectorNumericId(id), body as UpsertObjectiveInput),
          delete: (id) => repo.deleteObjective(coerceConnectorNumericId(id)),
          toConnector: toObjectiveConnector,
        },
        'key-results': {
          list: flatKeyResults,
          getById: (id) => flatKeyResults().find((kr) => kr.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseKeyResult,
          parseUpdate: parseKeyResultUpdate,
          create: (body) => repo.createKeyResult(body as UpsertKeyResultInput),
          update: (id, body) => {
            const numId = coerceConnectorNumericId(id);
            const existing = flatKeyResults().find((kr) => kr.id === numId);
            if (!existing) return null;
            const data = parseKeyResultUpdate(body as Record<string, unknown>) as z.infer<
              typeof KeyResultUpdateSchema
            >;
            return repo.updateKeyResult(numId, {
              objectiveId: existing.objectiveId,
              title: data.title,
              metric: data.metric,
              baseline: data.baseline,
              target: data.target,
              current: data.current,
              status: data.status as KeyResultStatus,
            });
          },
          delete: (id) => repo.deleteKeyResult(coerceConnectorNumericId(id)),
          toConnector: toKeyResultConnector,
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
