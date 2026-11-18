import { createAppServer } from '@/shared/services/create-app-server';
import { resolveFormsBuilderUrl } from '@/shared/config/resolveFormsBuilderUrl.node';

/** Forms Builder API base (FORMS_BUILDER_URL / platform default). */
export const formsBuilderUrl = resolveFormsBuilderUrl();

const mockData = {
  message: 'Hello from Example Server App!',
  serverName: 'example-server',
  timestamp: new Date().toISOString(),
  serverInfo: {
    server: 'Node.js ' + process.version.replace(/^v/, ''),
    platform: process.platform,
    arch: process.arch,
    uv: process.versions.uv || 'unknown',
  },
  endpoints: [
    '/data - Returns mock data (GET)',
    '/data/update Resets mock data and returns timestamp (GET)',
    '/health Returns health status (GET)',
  ],
  features: [
    'Simple HTTP server',
    'Mock data endpoint',
    'Health check endpoint',
    'Self-reporting server info',
  ],
};

const _port = process.env?.PORT ? parseInt(process.env.PORT, 10) : 3001;

const start = async () => {
  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('example-client-call-request', async () => {
          socket.emit('example-client-call-response', {
            data: 'I am glad your are conntect, hello from the server!',
          });
        });

        socket.on('disconnect', () => {
          console.log(`Client disconnected: ${socket.id}`);
        });
      });
    },
    registerRoutes: async (server) => {
      server.get('/data', async () => mockData);

      server.get('/data/update', async () => {
        console.log('[ExampleServerApp] Updating mock data');
        mockData.timestamp = new Date().toISOString();

        return {
          message: 'Data reset successful',
          timestamp: mockData.timestamp,
          data: mockData,
        };
      });
    },
  });

  await listen(_port);
};

export const startServer = start;
