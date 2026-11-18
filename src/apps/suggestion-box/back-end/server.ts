/** Suggestion Box server — REST API over the app's SQLite DB. */
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
import { bootstrapSuggestionTables, SuggestionRepository } from './suggestion-repository';
import type { Suggestion, UpsertSuggestionInput } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { suggestionDemoAdapter } from './db/seed-suggestion-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4115;

const StatusSchema = z.enum(['open', 'planned', 'in-progress', 'done', 'declined']);

const SuggestionSchema = z.object({
  title: z.string().min(1),
  body: z.string().default(''),
  author: z.string().default(''),
  status: StatusSchema.default('open'),
});

const VoteSchema = z.object({ delta: z.number().int() });

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapSuggestionTables(db);
  runDemoSeedOnBoot(db, 'app-suggestion-box', suggestionDemoAdapter);
  const repo = new SuggestionRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-suggestion-box',
    healthExtras: () => ({ app: 'suggestion-box' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/suggestions', async () => ({ suggestions: repo.list() }));

      server.post('/api/suggestions', async (request, reply) => {
        const parsed = SuggestionSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const suggestion = repo.create(parsed.data as UpsertSuggestionInput);
        const quarksRewarded = await grantLabActivityQuarkReward({
          kind: 'suggestionSubmit',
          userId: resolveLabAppActorUserId(request),
          sourceAppId: 'app-suggestion-box',
          sourceRef: labActivityQuarkSourceRef('suggestionSubmit', { suggestionId: suggestion.id }),
          reasonLabel: 'Suggestion submitted',
        });
        return reply.send({ suggestion, quarksRewarded });
      });

      server.put('/api/suggestions/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = SuggestionSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = repo.list().find((row) => row.id === id) ?? null;
        const suggestion = repo.update(id, parsed.data as UpsertSuggestionInput);
        if (!suggestion) return reply.status(404).send({ error: 'Suggestion not found' });

        // "Promoted" is leaving `open`; later moves between planned/in-progress are not promotions.
        if (before?.status === 'open' && suggestion.status !== 'open') {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-suggestion-box', 'suggestion', 'promoted'),
              sourceAppId: 'app-suggestion-box',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                suggestionId: suggestion.id,
                title: suggestion.title,
                author: suggestion.author,
                status: suggestion.status,
              },
            });
          } catch (publishError: unknown) {
            const logger = await VSCodeLogger.getInstance();
            logger.warn(
              `[suggestion-box] lab-events publish skipped: ${
                publishError instanceof Error ? publishError.message : String(publishError)
              }`,
            );
          }
        }

        return reply.send({ suggestion });
      });

      server.post('/api/suggestions/:id/vote', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = VoteSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const suggestion = repo.vote(id, parsed.data.delta);
        if (!suggestion) return reply.status(404).send({ error: 'Suggestion not found' });
        return reply.send({ suggestion });
      });

      server.delete('/api/suggestions/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.delete(id) ? 200 : 404).send({ success: true });
      });

      const parseSuggestion = catalogZodParse(SuggestionSchema);
      await registerCatalogConnectors(server, 'app-suggestion-box', {
        suggestions: {
          list: () => repo.list(),
          getById: (id) => repo.list().find((s) => s.id === id) ?? null,
          parseCreate: parseSuggestion,
          parseUpdate: parseSuggestion,
          create: async (body, request) => {
            const suggestion = repo.create(body as UpsertSuggestionInput);
            void grantLabActivityQuarkReward({
              kind: 'suggestionSubmit',
              userId: request ? resolveLabAppActorUserId(request) : null,
              sourceAppId: 'app-suggestion-box',
              sourceRef: labActivityQuarkSourceRef('suggestionSubmit', { suggestionId: suggestion.id }),
              reasonLabel: 'Suggestion submitted',
            });
            return suggestion;
          },
          update: (id, body) => repo.update(coerceConnectorNumericId(id), body as UpsertSuggestionInput),
          delete: (id) => repo.delete(coerceConnectorNumericId(id)),
          toConnector: (s: Suggestion) => ({
            id: s.id,
            title: s.title,
            body: s.body,
            author: s.author,
            status: s.status,
            votes: s.votes,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
