import 'dotenv/config';
import { startServer } from './server';

await startServer().then(() => {
  console.log('Fastify server initialized successfully.');
}).catch((err) => {
  console.error('Failed to initialize Fastify server:', err);
  process.exit(1);
});
