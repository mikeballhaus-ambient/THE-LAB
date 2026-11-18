/** Weather Dashboard server — saved locations over REST; conditions are always live. */
import { z } from 'zod';
import { createAppServer } from '@/shared/services/create-app-server';
import { registerPlatformApiProxyRoutes } from '@/shared/server/register-platform-api-proxy';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { bootstrapWeatherTables, WeatherRepository } from './weather-repository';
import type { UpsertLocationInput, WeatherLocation } from '../shared/types';
import { registerCatalogConnectors } from '@/shared/server/register-catalog-connectors';
import { coerceConnectorNumericId } from '@/shared/server/catalog-crud-connector-routes';
import { catalogZodParse } from '@/shared/server/catalog-zod-parse';
import { runDemoSeedOnBoot } from '@/shared/server/demo-seed-boot';
import { weatherDemoAdapter } from './db/seed-weather-demo';
import { registerWeatherMapRoutes } from './weather-map-routes';

const PORT = process.env?.PORT ? parseInt(process.env.PORT, 10) : 4120;

const LocationSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const start = async (): Promise<void> => {
  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  const db = dbProxy.getDb();
  bootstrapWeatherTables(db);
  runDemoSeedOnBoot(db, 'app-weather-dashboard', weatherDemoAdapter);
  const repo = new WeatherRepository(db);

  const { listen } = await createAppServer({
    attachSocketIO: true,
    catalogHostAppId: 'app-weather-dashboard',
    // Radar/satellite tiles are fetched by Leaflet as `<img>` requests, which cannot carry an
    // `Authorization` header. Without this they 401, and the browser's ORB then blocks the
    // response — surfacing as broken images rather than an auth error. The tiles are public,
    // non-user-specific imagery, so serving them unauthenticated is correct.
    additionalPublicPathPrefixes: ['/api/weather/map/tiles/', '/api/weather/map/forecast/'],
    healthExtras: () => ({ app: 'weather-dashboard' }),
    onSocketConnection: () => {
      /* REST-driven app. */
    },
    registerRoutes: async (server) => {
      registerWeatherMapRoutes(server, repo);

      server.get('/api/weather/locations', async () => ({ locations: repo.listLocations() }));

      server.post('/api/weather/locations', async (request, reply) => {
        const parsed = LocationSchema.safeParse(request.body);
        if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
        return reply.send({ location: repo.createLocation(parsed.data as UpsertLocationInput) });
      });

      server.delete('/api/weather/locations/:id', async (request, reply) => {
        const id = Number((request.params as { id: string }).id);
        return reply.status(repo.deleteLocation(id) ? 200 : 404).send({ success: true });
      });

      const parseLocation = catalogZodParse(LocationSchema);

      await registerCatalogConnectors(server, 'app-weather-dashboard', {
        locations: {
          list: () => repo.listLocations(),
          getById: (id) => repo.getLocation(coerceConnectorNumericId(id)),
          parseCreate: parseLocation,
          parseUpdate: parseLocation,
          create: (body) => repo.createLocation(body as UpsertLocationInput),
          update: (id, body) => repo.updateLocation(coerceConnectorNumericId(id), body as UpsertLocationInput),
          delete: (id) => repo.deleteLocation(coerceConnectorNumericId(id)),
          toConnector: (location: WeatherLocation) => ({
            id: location.id,
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        },
      });

      registerPlatformApiProxyRoutes(server);
    },
  });

  await listen(PORT);
};

export const startServer = start;
