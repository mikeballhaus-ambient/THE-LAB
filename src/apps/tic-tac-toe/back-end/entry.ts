import 'dotenv/config';
import { startServer } from './server';

await startServer().catch((err) => {
  console.error('Failed to initialize tic-tac-toe server:', err);
  process.exit(1);
});
