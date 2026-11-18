/** Job Applicant Tracker server — REST API over the app's SQLite DB. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { ApplicantRepository, bootstrapApplicantTables } from './applicant-repository';
import type { Applicant, HiringStage, UpsertApplicantInput } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { applicantDemoAdapter } from './db/seed-applicant-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4114;

const StageSchema = z.enum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']);

const ApplicantSchema = z.object({
  name: z.string().min(1),
  role: z.string().default(''),
  email: z.string().default(''),
  stage: StageSchema.default('applied'),
  notes: z.string().default(''),
});

const StageOnlySchema = z.object({ stage: StageSchema });

async function discardPublishError(publishError: unknown): Promise<void> {
  const logger = await VSCodeLogger.getInstance();
  logger.warn(
    `[job-applicant-tracker] lab-events publish skipped: ${
      publishError instanceof Error ? publishError.message : String(publishError)
    }`,
  );
}

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapApplicantTables(db);
  runDemoSeedOnBoot(db, 'app-job-applicant-tracker', applicantDemoAdapter);
  const repo = new ApplicantRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-job-applicant-tracker',
    healthExtras: () => ({ app: 'job-applicant-tracker' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/applicants', async () => ({ applicants: repo.list() }));

      server.post('/api/applicants', async (request, reply) => {
        const parsed = ApplicantSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ applicant: repo.create(parsed.data as UpsertApplicantInput) });
      });

      server.put('/api/applicants/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = ApplicantSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const applicant = repo.update(id, parsed.data as UpsertApplicantInput);
        if (!applicant) return reply.status(404).send({ error: 'Applicant not found' });
        return reply.send({ applicant });
      });

      server.patch('/api/applicants/:id/stage', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = StageOnlySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = repo.list().find((row) => row.id === id) ?? null;
        const applicant = repo.setStage(id, parsed.data.stage as HiringStage);
        if (!applicant) return reply.status(404).send({ error: 'Applicant not found' });

        // Both events ride the same transition; `hired` is a narrower, additional fact.
        if (before && before.stage !== applicant.stage) {
          try {
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-job-applicant-tracker', 'applicant', 'stage_changed'),
              sourceAppId: 'app-job-applicant-tracker',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                applicantId: applicant.id,
                name: applicant.name,
                role: applicant.role,
                stage: applicant.stage,
                previousStage: before.stage,
                email: applicant.email,
              },
            });
          } catch (publishError: unknown) {
            await discardPublishError(publishError);
          }

          if (applicant.stage === 'hired') {
            try {
              await publishLabDomainEvent(request, {
                schemaVersion: 1,
                id: randomUUID(),
                type: buildLabEventType('app-job-applicant-tracker', 'applicant', 'hired'),
                sourceAppId: 'app-job-applicant-tracker',
                occurredAt: new Date().toISOString(),
                actorUserId: resolveLabAppActorUserId(request),
                payload: {
                  applicantId: applicant.id,
                  name: applicant.name,
                  role: applicant.role,
                  email: applicant.email,
                },
              });
            } catch (publishError: unknown) {
              await discardPublishError(publishError);
            }
          }
        }

        return reply.send({ applicant });
      });

      server.delete('/api/applicants/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.delete(id) ? 200 : 404).send({ success: true });
      });

      const parseApplicant = catalogZodParse(ApplicantSchema);
      await registerCatalogConnectors(server, 'app-job-applicant-tracker', {
        applicants: {
          list: () => repo.list(),
          getById: (id) => repo.list().find((a) => a.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseApplicant,
          parseUpdate: parseApplicant,
          create: (body) => repo.create(body as UpsertApplicantInput),
          update: (id, body) => repo.update(coerceConnectorNumericId(id), body as UpsertApplicantInput),
          delete: (id) => repo.delete(coerceConnectorNumericId(id)),
          toConnector: (applicant: Applicant) => ({ ...applicant }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
