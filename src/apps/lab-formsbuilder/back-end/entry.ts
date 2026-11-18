import 'dotenv/config';
import { startServer } from './server';

function logFatal(label: string, reason: unknown): void {
  console.error(`[forms-builder] ${label}:`, reason);
  if (reason instanceof Error && reason.stack) {
    console.error(reason.stack);
  }
}

process.on('unhandledRejection', (reason) => {
  logFatal('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (err) => {
  logFatal('Uncaught exception', err);
  process.exit(1);
});

await startServer().then(() => {
  console.log('Fastify server initialized successfully.');
}).catch((err) => {
  logFatal('Failed to initialize Fastify server', err);
  process.exit(1);
});