import 'dotenv/config';
import { startServer } from './server';

await startServer().catch((err) => {
  console.error('Failed to initialize blackjack server:', err);
  process.exit(1);
});
