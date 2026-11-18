/** Time Tracking server — REST API over the app's SQLite DB. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapTimeTables, TimeRepository } from './time-repository';
import type { TimeEntry, TimesheetWeek, UpsertTimeEntryInput } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { timeTrackingDemoAdapter } from './db/seed-time-tracking-demo';
import {
  parseTimeEntryConnectorBody,
  timeEntryToConnector,
} from './utils/time-entry-connector-body';
import {
  parseTimesheetConnectorUpdate,
  timesheetToConnector,
} from './utils/timesheet-connector-body';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4113;

const EntrySchema = z.object({
  project: z.string().min(1),
  task: z.string().default(''),
  date: z.string().min(1),
  minutes: z.number().int().nonnegative(),
  billable: z.boolean().default(true),
  notes: z.string().default(''),
  weekKey: z.string().default(''),
});

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapTimeTables(db);
  runDemoSeedOnBoot(db, 'app-time-tracking', timeTrackingDemoAdapter);
  const repo = new TimeRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-time-tracking',
    healthExtras: () => ({ app: 'time-tracking' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/time/entries', async (request) => ({
        entries: repo.list((request.query as { weekKey?: string }).weekKey),
      }));

      server.get('/api/time/summaries', async () => ({ summaries: repo.summaries() }));

      server.post('/api/time/entries', async (request, reply) => {
        const parsed = EntrySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ entry: repo.create(parsed.data as UpsertTimeEntryInput) });
      });

      server.put('/api/time/entries/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = EntrySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const entry = repo.update(id, parsed.data as UpsertTimeEntryInput);
        if (!entry) return reply.status(404).send({ error: 'Entry not found' });
        return reply.send({ entry });
      });

      server.delete('/api/time/entries/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.delete(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/time/weeks/:weekKey/submit', async (request, reply) => {
        const weekKey = (request.params as { weekKey: string }).weekKey;
        const actorUserId = resolveLabAppActorUserId(request);
        // Snapshot the week before the write: the transition is "this week had drafts".
        const weekBefore = repo.list(weekKey);
        const count = repo.submitWeek(weekKey, actorUserId);

        if (count > 0) {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-time-tracking', 'timesheet', 'submitted'),
              sourceAppId: 'app-time-tracking',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                userId: actorUserId,
                weekKey,
                entryCount: weekBefore.length,
                totalMinutes: weekBefore.reduce((sum, entry) => sum + entry.minutes, 0),
              },
            });
          } catch (publishError: unknown) {
            const logger = await VSCodeLogger.getInstance();
            logger.warn(
              `[time-tracking] lab-events publish skipped: ${
                publishError instanceof Error ? publishError.message : String(publishError)
              }`,
            );
          }
        }

        return reply.send({ success: true, submitted: count });
      });

      await registerCatalogConnectors(server, 'app-time-tracking', {
        'time-entries': {
          list: () => repo.list(),
          getById: (id) => repo.list().find((e) => e.id === id) ?? null,
          create: async (body, request) =>
            repo.create(await parseTimeEntryConnectorBody(body as Record<string, unknown>, request)),
          update: async (id, body, request) => {
            const input = await parseTimeEntryConnectorBody(body as Record<string, unknown>, request);
            return repo.update(id as number, input);
          },
          delete: (id) => repo.delete(id as number),
          toConnector: (entry: TimeEntry) => timeEntryToConnector(entry),
        },
        timesheets: {
          list: () => repo.listTimesheets(),
          getById: (id) => repo.getTimesheet(String(id)),
          create: async (body) => {
            const weekKey = String((body as Record<string, unknown>).weekKey ?? '').trim();
            if (!weekKey) {
              throw new Error('weekKey is required');
            }
            return repo.markWeekPendingApproval(weekKey, null);
          },
          update: async (id, body) => {
            const weekKey = String(id);
            const parsed = parseTimesheetConnectorUpdate(body as Record<string, unknown>);
            if (!parsed.approvalStatus) {
              return repo.getTimesheet(weekKey);
            }
            return repo.updateTimesheetApproval(weekKey, parsed.approvalStatus);
          },
          delete: (id) => repo.deleteTimesheet(String(id)),
          toConnector: (row: TimesheetWeek) => timesheetToConnector(row),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
