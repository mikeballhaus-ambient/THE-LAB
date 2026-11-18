/** Project Charter server — REST API over the app's SQLite DB. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapCharterTables, CharterRepository } from './charter-repository';
import type { Charter, UpsertCharterInput } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { charterDemoAdapter } from './db/seed-charter-demo';
import {
  parseCharterConnectorBody,
  sponsorValueForConnector,
  stakeholdersValueForConnector,
} from './utils/charter-connector-body';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4112;

const StatusSchema = z.enum(['draft', 'active', 'on-hold', 'complete']);

const CharterSchema = z.object({
  title: z.string().min(1),
  sponsor: z.string().default(''),
  purpose: z.string().default(''),
  scope: z.string().default(''),
  outOfScope: z.string().default(''),
  stakeholders: z.string().default(''),
  goals: z.string().default(''),
  status: StatusSchema.default('draft'),
});

async function discardPublishError(publishError: unknown): Promise<void> {
  const logger = await VSCodeLogger.getInstance();
  logger.warn(
    `[project-charter] lab-events publish skipped: ${
      publishError instanceof Error ? publishError.message : String(publishError)
    }`,
  );
}

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapCharterTables(db);
  runDemoSeedOnBoot(db, 'app-project-charter', charterDemoAdapter);
  const repo = new CharterRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-project-charter',
    healthExtras: () => ({ app: 'project-charter' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/charter/charters', async () => ({ charters: repo.list() }));

      server.post('/api/charter/charters', async (request, reply) => {
        const parsed = CharterSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ charter: repo.create(parsed.data as UpsertCharterInput) });
      });

      server.put('/api/charter/charters/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = CharterSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = repo.list().find((row) => row.id === id) ?? null;
        const charter = repo.update(id, parsed.data as UpsertCharterInput);
        if (!charter) return reply.status(404).send({ error: 'Charter not found' });

        // `approved` is specifically draft → active; a later active → on-hold is not an approval.
        if (before?.status === 'draft' && charter.status === 'active') {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-project-charter', 'charter', 'approved'),
              sourceAppId: 'app-project-charter',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                charterId: charter.id,
                title: charter.title,
                status: charter.status,
                sponsor: charter.sponsor,
              },
            });
          } catch (publishError: unknown) {
            await discardPublishError(publishError);
          }
        }

        const scopeChanged =
          before != null && (before.scope !== charter.scope || before.outOfScope !== charter.outOfScope);
        if (scopeChanged) {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-project-charter', 'charter', 'scope_changed'),
              sourceAppId: 'app-project-charter',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                charterId: charter.id,
                title: charter.title,
                scope: charter.scope,
                outOfScope: charter.outOfScope,
              },
            });
          } catch (publishError: unknown) {
            await discardPublishError(publishError);
          }
        }

        return reply.send({ charter });
      });

      server.delete('/api/charter/charters/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.delete(id) ? 200 : 404).send({ success: true });
      });

      await registerCatalogConnectors(server, 'app-project-charter', {
        charters: {
          list: () => repo.list(),
          getById: (id) => repo.list().find((c) => c.id === coerceConnectorNumericId(id)) ?? null,
          create: async (body, request) =>
            repo.create(await parseCharterConnectorBody(body as Record<string, unknown>, request)),
          update: async (id, body, request) => {
            const input = await parseCharterConnectorBody(body as Record<string, unknown>, request);
            return repo.update(coerceConnectorNumericId(id), input);
          },
          delete: (id) => repo.delete(coerceConnectorNumericId(id)),
          toConnector: (charter: Charter) => ({
            ...charter,
            sponsor: sponsorValueForConnector(charter),
            stakeholders: stakeholdersValueForConnector(charter),
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
