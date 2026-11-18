import 'dotenv/config';
import { startServer } from './server';

await startServer().catch((err) => {
  console.error('Failed to initialize connect-four server:', err);
  process.exit(1);
});
