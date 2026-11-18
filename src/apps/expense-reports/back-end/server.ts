/** Expense Reports server — REST API over the app's SQLite DB. */
import { z } from 'zod';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapExpenseTables, ExpenseRepository } from './expense-repository';
import type { ExpenseReport, ExpenseStatus, UpsertExpenseInput } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { expenseDemoAdapter } from './db/seed-expense-demo';
import {
  categoryValueForConnector,
  parseExpenseConnectorBody,
  parseExpenseConnectorStatusUpdate,
  submitterValueForConnector,
} from './utils/expense-connector-body';
import { publishExpenseDomainEventsAfterStatusChange } from './utils/expense-domain-events';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4116;

const StatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected', 'reimbursed']);

const ExpenseSchema = z.object({
  title: z.string().min(1),
  submitter: z.string().default(''),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().default('USD'),
  category: z.string().default(''),
  spentOn: z.string().default(''),
  receiptUrl: z.string().default(''),
  notes: z.string().default(''),
});

const StatusOnlySchema = z.object({ status: StatusSchema });

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapExpenseTables(db);
  runDemoSeedOnBoot(db, 'app-expense-reports', expenseDemoAdapter);
  const repo = new ExpenseRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-expense-reports',
    healthExtras: () => ({ app: 'expense-reports' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/expenses', async () => ({
        expenses: repo.list(),
        totals: repo.totals(),
      }));

      server.post('/api/expenses', async (request, reply) => {
        const parsed = ExpenseSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ expense: repo.create(parsed.data as UpsertExpenseInput) });
      });

      server.put('/api/expenses/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = ExpenseSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const expense = repo.update(id, parsed.data as UpsertExpenseInput);
        if (!expense) return reply.status(404).send({ error: 'Expense not found' });
        return reply.send({ expense });
      });

      server.patch('/api/expenses/:id/status', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = StatusOnlySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const before = repo.list().find((row) => row.id === id) ?? null;
        const expense = repo.setStatus(id, parsed.data.status as ExpenseStatus);
        if (!expense) return reply.status(404).send({ error: 'Expense not found' });

        await publishExpenseDomainEventsAfterStatusChange(request, before, expense);

        return reply.send({ expense });
      });

      server.delete('/api/expenses/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.delete(id) ? 200 : 404).send({ success: true });
      });

      await registerCatalogConnectors(server, 'app-expense-reports', {
        expenses: {
          list: () => repo.list(),
          getById: (id) => repo.list().find((e) => e.id === id) ?? null,
          create: async (body, request) =>
            repo.create(await parseExpenseConnectorBody(body as Record<string, unknown>, request)),
          update: async (id, body, request) => {
            const record = body as Record<string, unknown>;
            const statusOnly = parseExpenseConnectorStatusUpdate(record);
            if (statusOnly) {
              const before = repo.list().find((row) => row.id === id) ?? null;
              const expense = repo.setStatus(id as number, statusOnly);
              if (!expense) {
                return null;
              }
              await publishExpenseDomainEventsAfterStatusChange(request, before, expense);
              return expense;
            }
            const input = await parseExpenseConnectorBody(record, request);
            return repo.update(id as number, input);
          },
          delete: (id) => repo.delete(id as number),
          toConnector: (expense: ExpenseReport) => ({
            ...expense,
            submitter: submitterValueForConnector(expense),
            category: categoryValueForConnector(expense.category),
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
