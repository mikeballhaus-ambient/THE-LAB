/** Rental Property server — REST API over the app's SQLite DB. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { VSCodeLogger } from '@/backend/utils/logger';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { publishLabDomainEvent } from '@/shared/services/platform-lab-events.client.node';
import { buildLabEventType } from '@/shared/types/lab-domain-event';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapRentalTables, RentalRepository } from './rental-repository';
import type {
  Lease,
  PropertyWithDetails,
  RentPayment,
  RentalProperty,
  UpsertLeaseInput,
  UpsertPropertyInput,
  UpsertRentPaymentInput,
} from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { rentalDemoAdapter } from './db/seed-rental-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4122;

const PropertyStatusSchema = z.enum(['vacant', 'occupied', 'maintenance']);
const LeaseStatusSchema = z.enum(['active', 'ended', 'pending']);
const RentStatusSchema = z.enum(['due', 'paid', 'late']);

const RentStatusOnlySchema = z.object({ status: RentStatusSchema });

const PropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().default(''),
  monthlyRentCents: z.number().int().nonnegative().default(0),
  status: PropertyStatusSchema.default('vacant'),
  notes: z.string().default(''),
});

const LeaseSchema = z.object({
  propertyId: z.number().int().positive(),
  tenantName: z.string().min(1),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  status: LeaseStatusSchema.default('active'),
});

const LeaseConnectorSchema = z.object({
  propertyId: z.number().int().positive(),
  tenant: z.string().min(1),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  status: LeaseStatusSchema.default('active'),
});

const LeaseConnectorUpdateSchema = LeaseConnectorSchema.omit({ propertyId: true });

function toLeaseInput(body: z.infer<typeof LeaseConnectorSchema>): UpsertLeaseInput {
  return {
    propertyId: body.propertyId,
    tenantName: body.tenant,
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status,
  };
}

const PaymentSchema = z.object({
  leaseId: z.number().int().positive(),
  periodMonth: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  status: RentStatusSchema.default('due'),
});

async function discardPublishError(publishError: unknown): Promise<void> {
  const logger = await VSCodeLogger.getInstance();
  logger.warn(
    `[rental-property] lab-events publish skipped: ${
      publishError instanceof Error ? publishError.message : String(publishError)
    }`,
  );
}

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapRentalTables(db);
  runDemoSeedOnBoot(db, 'app-rental-property', rentalDemoAdapter);
  const repo = new RentalRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-rental-property',
    healthExtras: () => ({ app: 'rental-property' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/rental/properties', async () => ({ properties: repo.list() }));

      server.post('/api/rental/properties', async (request, reply) => {
        const parsed = PropertySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ property: repo.createProperty(parsed.data as UpsertPropertyInput) });
      });

      server.delete('/api/rental/properties/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteProperty(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/rental/leases', async (request, reply) => {
        const parsed = LeaseSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ lease: repo.addLease(parsed.data as UpsertLeaseInput) });
      });

      server.post('/api/rental/payments', async (request, reply) => {
        const parsed = PaymentSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ payment: repo.addPayment(parsed.data as UpsertRentPaymentInput) });
      });

      server.patch('/api/rental/payments/:id/pay', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const payment = repo.markPaid(id);
        if (!payment) return reply.status(404).send({ error: 'Payment not found' });
        return reply.send({ payment });
      });

      /**
       * Status transitions other than "paid" — principally the entry to `due`, which no route
       * could previously express. `late` is accepted but publishes nothing: it is a date
       * comparison delivered by the platform requirement sweep, not a state a route reports.
       */
      server.patch('/api/rental/payments/:id/status', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = RentStatusOnlySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = flatPayments().find((payment) => payment.id === id) ?? null;
        const payment = repo.setPaymentStatus(id, parsed.data.status);
        if (!payment) return reply.status(404).send({ error: 'Payment not found' });

        if (before?.status !== 'due' && payment.status === 'due') {
          try {
            const lease = flatLeases().find((row) => row.id === payment.leaseId) ?? null;
            await publishLabDomainEvent(request, {
              schemaVersion: 1,
              id: randomUUID(),
              type: buildLabEventType('app-rental-property', 'rent', 'due'),
              sourceAppId: 'app-rental-property',
              occurredAt: new Date().toISOString(),
              actorUserId: resolveLabAppActorUserId(request),
              payload: {
                rentPaymentId: payment.id,
                leaseId: payment.leaseId,
                propertyId: lease?.propertyId ?? null,
                periodMonth: payment.periodMonth,
                amountCents: payment.amountCents,
              },
            });
          } catch (publishError: unknown) {
            await discardPublishError(publishError);
          }
        }

        return reply.send({ payment });
      });

      const parseProperty = catalogZodParse(PropertySchema);
      const parsePayment = catalogZodParse(PaymentSchema);
      const parseLease = catalogZodParse(LeaseConnectorSchema);
      const parseLeaseUpdate = catalogZodParse(LeaseConnectorUpdateSchema);
      const flatLeases = (): Lease[] => repo.list().flatMap((property) => property.leases);
      const flatPayments = (): RentPayment[] => repo.list().flatMap((property) => property.payments);

      /** The connector record is the property without its nested leases/payments. */
      const toPropertyRecord = (property: PropertyWithDetails): RentalProperty => ({
        id: property.id,
        name: property.name,
        address: property.address,
        monthlyRentCents: property.monthlyRentCents,
        status: property.status,
        notes: property.notes,
        createdAt: property.createdAt,
      });

      await registerCatalogConnectors(server, 'app-rental-property', {
        properties: {
          list: () => repo.list().map(toPropertyRecord),
          getById: (id) => {
            const numId = coerceConnectorNumericId(id);
            const row = repo.list().find((p) => p.id === numId);
            return row ? toPropertyRecord(row) : null;
          },
          parseCreate: parseProperty,
          parseUpdate: parseProperty,
          create: (body) => repo.createProperty(body as UpsertPropertyInput),
          update: (id, body) => repo.updateProperty(coerceConnectorNumericId(id), body as UpsertPropertyInput),
          delete: (id) => repo.deleteProperty(coerceConnectorNumericId(id)),
          toConnector: (property: RentalProperty) => ({ ...property }),
        },
        leases: {
          list: flatLeases,
          getById: (id) => flatLeases().find((lease) => lease.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: (body) =>
            toLeaseInput(parseLease(body as Record<string, unknown>) as z.infer<typeof LeaseConnectorSchema>),
          parseUpdate: (body) => {
            const data = parseLeaseUpdate(body as Record<string, unknown>) as z.infer<
              typeof LeaseConnectorUpdateSchema
            >;
            return { tenantName: data.tenant, startDate: data.startDate, endDate: data.endDate, status: data.status };
          },
          create: (body) => repo.addLease(body as UpsertLeaseInput),
          update: (id, body) => {
            const numId = coerceConnectorNumericId(id);
            const existing = flatLeases().find((lease) => lease.id === numId);
            if (!existing) return null;
            const data = parseLeaseUpdate(body as Record<string, unknown>) as z.infer<
              typeof LeaseConnectorUpdateSchema
            >;
            return repo.updateLease(numId, {
              propertyId: existing.propertyId,
              tenantName: data.tenant,
              startDate: data.startDate,
              endDate: data.endDate,
              status: data.status,
            });
          },
          delete: (id) => repo.deleteLease(coerceConnectorNumericId(id)),
          toConnector: (lease: Lease) => ({
            id: lease.id,
            propertyId: lease.propertyId,
            tenant: lease.tenantName,
            startDate: lease.startDate,
            endDate: lease.endDate,
            status: lease.status,
          }),
        },
        'rent-payments': {
          list: flatPayments,
          getById: (id) => flatPayments().find((payment) => payment.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parsePayment,
          parseUpdate: parsePayment,
          create: (body) => repo.addPayment(body as UpsertRentPaymentInput),
          update: (id, body) => repo.updatePayment(coerceConnectorNumericId(id), body as UpsertRentPaymentInput),
          delete: (id) => repo.deletePayment(coerceConnectorNumericId(id)),
          toConnector: (payment: RentPayment) => ({
            id: payment.id,
            leaseId: payment.leaseId,
            periodMonth: payment.periodMonth,
            amountCents: payment.amountCents,
            status: payment.status,
            paidAt: payment.paidAt,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
