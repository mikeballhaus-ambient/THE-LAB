import { createAppServer } from '@/shared/services/create-app-server';
import { AppDatabaseServiceProxy } from '../db/app-db-service';
import { SOCKET_EVENTS } from '../shared/types';

const mockData = {
  message: 'Hello from Example Server App!',
};

const _port = process.env?.PORT ? parseInt(process.env.PORT, 10) : 3001;

const start = async () => {
  await AppDatabaseServiceProxy.getInstance().initialize();

  const { listen } = await createAppServer({
    attachSocketIO: true,
    onSocketConnection: (io) => {
      io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_REQUEST, async () => {
          socket.emit(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_RESPONSE, {
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
    },
  });

  await listen(_port);
};

export const startServer = start;
