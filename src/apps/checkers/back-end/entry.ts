import 'dotenv/config';
import { startServer } from './server';

await startServer().catch((err) => {
  console.error('Failed to initialize checkers server:', err);
  process.exit(1);
});
