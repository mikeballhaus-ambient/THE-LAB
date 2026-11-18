/**
 * Travel Itinerary server — REST API over the app's SQLite DB (trips + items).
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
import { bootstrapTravelTables, TravelRepository } from './travel-repository';
import type { ItineraryItem, Trip, UpsertItineraryItemInput, UpsertTripInput } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { travelDemoAdapter } from './db/seed-travel-demo';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4111;

const KindSchema = z.enum(['flight', 'hotel', 'activity', 'transport', 'other']);

const TripSchema = z.object({
  name: z.string().min(1),
  destination: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  notes: z.string().default(''),
});

const ItemSchema = z.object({
  tripId: z.number().int().positive(),
  kind: KindSchema.default('activity'),
  title: z.string().min(1),
  startAt: z.string().default(''),
  endAt: z.string().default(''),
  location: z.string().default(''),
  confirmation: z.string().default(''),
});

const ItemUpdateSchema = ItemSchema.omit({ tripId: true });

/** "Scheduled" is a trip with both endpoints of its window — not merely a saved trip. */
function isTripScheduled(trip: { startDate: string; endDate: string }): boolean {
  return trip.startDate.trim() !== '' && trip.endDate.trim() !== '';
}

async function publishTripScheduled(
  request: Parameters<typeof publishLabDomainEvent>[0],
  trip: Trip,
): Promise<void> {
  try {
    await publishLabDomainEvent(request, {
      schemaVersion: 1,
      id: randomUUID(),
      type: buildLabEventType('app-travel-itinerary', 'trip', 'scheduled'),
      sourceAppId: 'app-travel-itinerary',
      occurredAt: new Date().toISOString(),
      actorUserId: resolveLabAppActorUserId(request),
      payload: {
        tripId: trip.id,
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
    });
  } catch (publishError: unknown) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[travel-itinerary] lab-events publish skipped: ${
        publishError instanceof Error ? publishError.message : String(publishError)
      }`,
    );
  }
}

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapTravelTables(db);
  runDemoSeedOnBoot(db, 'app-travel-itinerary', travelDemoAdapter);
  const repo = new TravelRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-travel-itinerary',
    healthExtras: () => ({ app: 'travel-itinerary' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {
      server.get('/api/travel/trips', async () => ({ trips: repo.listTrips() }));

      server.post('/api/travel/trips', async (request, reply) => {
        const parsed = TripSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const trip = repo.createTrip(parsed.data as UpsertTripInput);
        // A trip created already-dated is scheduled on creation.
        if (isTripScheduled(trip)) {
          await publishTripScheduled(request, trip);
        }
        return reply.send({ trip });
      });

      server.put('/api/travel/trips/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = TripSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = repo.listTrips().find((row) => row.id === id) ?? null;
        const trip = repo.updateTrip(id, parsed.data as UpsertTripInput);
        if (!trip) return reply.status(404).send({ error: 'Trip not found' });
        // Publish on entry to "both dates present", not on any later edit of a dated trip.
        if (before && !isTripScheduled(before) && isTripScheduled(trip)) {
          await publishTripScheduled(request, trip);
        }
        return reply.send({ trip });
      });

      server.delete('/api/travel/trips/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteTrip(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/travel/items', async (request, reply) => {
        const parsed = ItemSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ item: repo.createItem(parsed.data as UpsertItineraryItemInput) });
      });

      server.put('/api/travel/items/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = ItemUpdateSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const item = repo.updateItem(id, { tripId: 0, ...parsed.data });
        if (!item) return reply.status(404).send({ error: 'Item not found' });
        return reply.send({ item });
      });

      server.delete('/api/travel/items/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteItem(id) ? 200 : 404).send({ success: true });
      });

      const parseTrip = catalogZodParse(TripSchema);
      const parseItem = catalogZodParse(ItemSchema);
      const parseItemUpdate = catalogZodParse(ItemUpdateSchema);
      const flatItems = (): ItineraryItem[] => repo.listTrips().flatMap((trip) => trip.items);

      await registerCatalogConnectors(server, 'app-travel-itinerary', {
        trips: {
          list: () =>
            repo.listTrips().map((row) => {
              const { items, ...trip } = row;
              void items;
              return trip;
            }),
          getById: (id) => {
            const numId = coerceConnectorNumericId(id);
            const row = repo.listTrips().find((t) => t.id === numId);
            if (!row) return null;
            const { items, ...trip } = row;
            void items;
            return trip;
          },
          parseCreate: parseTrip,
          parseUpdate: parseTrip,
          create: (body) => repo.createTrip(body as UpsertTripInput),
          update: (id, body) => repo.updateTrip(coerceConnectorNumericId(id), body as UpsertTripInput),
          delete: (id) => repo.deleteTrip(coerceConnectorNumericId(id)),
          toConnector: (trip: Trip) => ({ ...trip }),
        },
        'itinerary-items': {
          list: flatItems,
          getById: (id) => flatItems().find((item) => item.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseItem,
          parseUpdate: parseItemUpdate,
          create: (body) => repo.createItem(body as UpsertItineraryItemInput),
          update: (id, body) => {
            const numId = coerceConnectorNumericId(id);
            const existing = flatItems().find((item) => item.id === numId);
            if (!existing) return null;
            const data = parseItemUpdate(body as Record<string, unknown>) as z.infer<typeof ItemUpdateSchema>;
            return repo.updateItem(numId, { tripId: existing.tripId, ...data });
          },
          delete: (id) => repo.deleteItem(coerceConnectorNumericId(id)),
          toConnector: (item: ItineraryItem) => {
            const trip = repo.listTrips().find((t) => t.id === item.tripId);
            return {
              ...item,
              tripName: trip?.name ?? '(unnamed trip)',
            };
          },
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
