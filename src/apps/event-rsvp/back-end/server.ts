/** Event RSVP server — REST API over the app's SQLite DB. */
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
import { bootstrapRsvpTables, RsvpRepository } from './rsvp-repository';
import type { EventItem, Rsvp, UpsertEventInput, UpsertRsvpInput } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { rsvpDemoAdapter } from './db/seed-rsvp-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4123;

const ResponseSchema = z.enum(['yes', 'no', 'maybe']);

const EventSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  startsAt: z.string().default(''),
  endsAt: z.string().default(''),
  location: z.string().default(''),
  capacity: z.number().int().nonnegative().default(0),
});

const RsvpSchema = z.object({
  eventId: z.number().int().positive(),
  guestName: z.string().min(1),
  guestUserId: z.number().int().positive().optional().nullable(),
  response: ResponseSchema.default('yes'),
  headcount: z.number().int().min(1).default(1),
  note: z.string().default(''),
});

const RsvpUpdateSchema = RsvpSchema.omit({ eventId: true });

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapRsvpTables(db);
  runDemoSeedOnBoot(db, 'app-event-rsvp', rsvpDemoAdapter);
  const repo = new RsvpRepository(db);

  async function rewardEventRsvp(
    userId: number | null | undefined,
    eventId: number,
  ): Promise<number> {
    if (userId == null || userId < 1) {
      return 0;
    }
    return grantLabActivityQuarkReward({
      kind: 'eventRsvp',
      userId,
      sourceAppId: 'app-event-rsvp',
      sourceRef: labActivityQuarkSourceRef('eventRsvp', { eventId, userId }),
      reasonLabel: 'Event RSVP submitted',
    });
  }

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-event-rsvp',
    healthExtras: () => ({ app: 'event-rsvp' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/rsvp/events', async () => ({ events: repo.list() }));

      server.post('/api/rsvp/events', async (request, reply) => {
        const parsed = EventSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ event: repo.createEvent(parsed.data as UpsertEventInput) });
      });

      server.delete('/api/rsvp/events/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteEvent(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/rsvp/responses', async (request, reply) => {
        const parsed = RsvpSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const actorId = resolveLabAppActorUserId(request);
        const rsvp = repo.addRsvp({
          ...(parsed.data as UpsertRsvpInput),
          guestUserId: actorId ?? parsed.data.guestUserId ?? null,
        });

        // Creation of a response row *is* the transition — there is no prior state to compare.
        try {
          await publishLabDomainEvent(request, {
            schemaVersion: 1,
            id: randomUUID(),
            type: buildLabEventType('app-event-rsvp', 'rsvp-response', 'received'),
            sourceAppId: 'app-event-rsvp',
            occurredAt: new Date().toISOString(),
            actorUserId: resolveLabAppActorUserId(request),
            payload: {
              rsvpResponseId: rsvp.id,
              eventId: rsvp.eventId,
              guestName: rsvp.guestName,
              guestUserId: rsvp.guestUserId ?? null,
              response: rsvp.response,
              headcount: rsvp.headcount,
            },
          });
        } catch (publishError: unknown) {
          const logger = await VSCodeLogger.getInstance();
          logger.warn(
            `[event-rsvp] lab-events publish skipped: ${
              publishError instanceof Error ? publishError.message : String(publishError)
            }`,
          );
        }

        const quarksRewarded = await rewardEventRsvp(
          rsvp.guestUserId ?? actorId,
          rsvp.eventId,
        );

        return reply.send({ rsvp, quarksRewarded });
      });

      server.delete('/api/rsvp/responses/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteRsvp(id) ? 200 : 404).send({ success: true });
      });

      const parseEvent = catalogZodParse(EventSchema);
      const parseRsvp = catalogZodParse(RsvpSchema);
      const parseRsvpUpdate = catalogZodParse(RsvpUpdateSchema);
      const flatRsvps = (): Rsvp[] => repo.list().flatMap((event) => event.rsvps);

      await registerCatalogConnectors(server, 'app-event-rsvp', {
        events: {
          list: () =>
            repo.list().map((row) => {
              const { rsvps, attending, ...event } = row;
              void rsvps;
              void attending;
              return event;
            }),
          getById: (id) => {
            const numId = coerceConnectorNumericId(id);
            const row = repo.list().find((e) => e.id === numId);
            if (!row) return null;
            const { rsvps, attending, ...event } = row;
            void rsvps;
            void attending;
            return event;
          },
          parseCreate: parseEvent,
          parseUpdate: parseEvent,
          create: (body) => repo.createEvent(body as UpsertEventInput),
          update: (id, body) => repo.updateEvent(coerceConnectorNumericId(id), body as UpsertEventInput),
          delete: (id) => repo.deleteEvent(coerceConnectorNumericId(id)),
          toConnector: (event: EventItem) => ({ ...event }),
        },
        'rsvp-responses': {
          list: flatRsvps,
          getById: (id) => flatRsvps().find((rsvp) => rsvp.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseRsvp,
          parseUpdate: parseRsvpUpdate,
          create: async (body, request) => {
            const input = body as UpsertRsvpInput;
            const actorId = request ? resolveLabAppActorUserId(request) : null;
            const rsvp = repo.addRsvp({
              ...input,
              guestUserId: actorId ?? input.guestUserId ?? null,
            });
            void rewardEventRsvp(rsvp.guestUserId ?? actorId, rsvp.eventId);
            return rsvp;
          },
          update: (id, body) => {
            const existing = flatRsvps().find((rsvp) => rsvp.id === coerceConnectorNumericId(id));
            if (!existing) return null;
            const data = parseRsvpUpdate(body as Record<string, unknown>) as z.infer<typeof RsvpUpdateSchema>;
            return repo.updateRsvp(coerceConnectorNumericId(id), {
              eventId: existing.eventId,
              guestName: data.guestName,
              response: data.response,
              headcount: data.headcount,
              note: data.note,
            });
          },
          delete: (id) => repo.deleteRsvp(coerceConnectorNumericId(id)),
          toConnector: (rsvp: Rsvp) => ({
            id: rsvp.id,
            eventId: rsvp.eventId,
            guestName: rsvp.guestName,
            response: rsvp.response,
            headcount: rsvp.headcount,
            note: rsvp.note,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
