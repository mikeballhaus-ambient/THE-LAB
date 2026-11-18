/**
 * Link games tag to greenfield catalog apps (idempotent).
 * Usage: npx tsx src/scripts/ensure-greenfield-game-catalog-tags.ts
 */
import { databaseManager } from '@/backend/db/DatabaseManager';
import { ensureCatalogTagsAndLinkApp } from '@/backend/db/AppTags/ensure-catalog-tags-for-app';

const APP_IDS = [
  'app-checkers',
  'app-chess',
  'app-hangman',
  'app-connect-four',
  'app-battleship',
  'app-poker-holdem',
  'app-blackjack',
  'app-tic-tac-toe',
];

async function main(): Promise<void> {
  await databaseManager.initialize();
  for (const id of APP_IDS) {
    ensureCatalogTagsAndLinkApp(id, [{ id: 'games' }]);
    console.log(`Linked games tag: ${id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
