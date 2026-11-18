/** Home Maintenance server — REST API over the app's SQLite DB. */
import { z } from 'zod';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapHomeTables, HomeMaintenanceRepository } from './home-repository';
import type {
  HomeAsset,
  MaintenanceStatus,
  MaintenanceTask,
  UpsertAssetInput,
  UpsertMaintenanceTaskInput,
} from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { homeDemoAdapter } from './db/seed-home-demo';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4121;

const StatusSchema = z.enum(['scheduled', 'due', 'done', 'skipped']);
const PrioritySchema = z.enum(['low', 'normal', 'high']);

const AssetSchema = z.object({
  name: z.string().min(1),
  category: z.string().default(''),
  location: z.string().default(''),
  notes: z.string().default(''),
});

const TaskSchema = z.object({
  assetId: z.number().int().positive(),
  title: z.string().min(1),
  dueDate: z.string().default(''),
  priority: PrioritySchema.default('normal'),
  notes: z.string().default(''),
  cost: z.number().nonnegative().nullable().optional(),
});

const StatusOnlySchema = z.object({ status: StatusSchema });

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapHomeTables(db);
  runDemoSeedOnBoot(db, 'app-home-maintenance', homeDemoAdapter);
  const repo = new HomeMaintenanceRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-home-maintenance',
    healthExtras: () => ({ app: 'home-maintenance' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {

      server.get('/api/home/assets', async () => ({ assets: repo.list() }));

      server.post('/api/home/assets', async (request, reply) => {
        const parsed = AssetSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ asset: repo.createAsset(parsed.data as UpsertAssetInput) });
      });

      server.delete('/api/home/assets/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteAsset(id) ? 200 : 404).send({ success: true });
      });

      server.post('/api/home/tasks', async (request, reply) => {
        const parsed = TaskSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ task: repo.addTask(parsed.data as UpsertMaintenanceTaskInput) });
      });

      server.patch('/api/home/tasks/:id/status', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        const parsed = StatusOnlySchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        const task = repo.setTaskStatus(id, parsed.data.status as MaintenanceStatus);
        if (!task) return reply.status(404).send({ error: 'Task not found' });
        return reply.send({ task });
      });

      server.delete('/api/home/tasks/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteTask(id) ? 200 : 404).send({ success: true });
      });

      const parseTask = catalogZodParse(TaskSchema);
      const parseAsset = catalogZodParse(AssetSchema);
      const flatTasks = (): MaintenanceTask[] =>
        repo.list().flatMap((asset) => asset.tasks);
      const flatAssets = (): HomeAsset[] =>
        repo.list().map((row) => {
          const { tasks, ...asset } = row;
          void tasks;
          return asset;
        });

      await registerCatalogConnectors(server, 'app-home-maintenance', {
        'maintenance-tasks': {
          list: flatTasks,
          getById: (id) => flatTasks().find((task) => task.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseTask,
          parseUpdate: parseTask,
          create: (body) => repo.addTask(body as UpsertMaintenanceTaskInput),
          update: (id, body) => repo.updateTask(coerceConnectorNumericId(id), body as UpsertMaintenanceTaskInput),
          delete: (id) => repo.deleteTask(coerceConnectorNumericId(id)),
          toConnector: (task: MaintenanceTask) => ({
            id: task.id,
            assetId: task.assetId,
            assetName: task.assetName ?? '',
            title: task.title,
            dueDate: task.dueDate,
            priority: task.priority,
            notes: task.notes,
            cost: task.cost,
          }),
        },
        'home-assets': {
          list: flatAssets,
          getById: (id) => flatAssets().find((asset) => asset.id === coerceConnectorNumericId(id)) ?? null,
          parseCreate: parseAsset,
          parseUpdate: parseAsset,
          create: (body) => repo.createAsset(body as UpsertAssetInput),
          update: (id, body) => repo.updateAsset(coerceConnectorNumericId(id), body as UpsertAssetInput),
          delete: (id) => repo.deleteAsset(coerceConnectorNumericId(id)),
          toConnector: (asset: HomeAsset) => ({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            location: asset.location,
            notes: asset.notes,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
