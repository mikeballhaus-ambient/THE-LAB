/**
 * One-shot registry insert for app-word-tile when src/apps/word-tile already exists.
 *
 * Usage: npx tsx src/scripts/register-word-tile-app-once.ts
 */
import { databaseManager } from '@/backend/db/DatabaseManager';
import { appsService } from '@/backend/db/Apps/apps-service';
import { ensureCatalogTagsAndLinkApp } from '@/backend/db/AppTags/ensure-catalog-tags-for-app';
import { wordTileAppInstructions } from '@/backend/db/Apps/app-instructions/word-tile-app-instructions';
import type { IApp } from '@/shared/types/app/app.d';
import { AppDatabaseService } from '@/backend/AppDatabaseService';

const APP_ID = 'app-word-tile';

async function main(): Promise<void> {
  await databaseManager.initialize();

  const existing = appsService.getAppById(APP_ID);
  if (existing) {
    console.log(`Already registered: ${existing.id} (${existing.name}), port ${existing.server?.port ?? 'n/a'}`);
    process.exit(0);
  }

  const app: IApp = {
    id: APP_ID,
    name: 'Word Tile',
    description: 'Turn-based tile word grid — vs AI or invite a friend.',
    type: 'hybrid',
    componentPath: '/src/apps/word-tile/front-end/App.vue',
    isServerSideEnabled: true,
    isEnabled: true,
    order: 21,
    faIcon: 'fa-table-cells-large',
    server: {
      entry: '/src/apps/word-tile/back-end/entry.ts',
      port: 4102,
      env: { NODE_ENV: 'development' },
    },
    dependencies: [],
    optionalDependencies: [],
    requiresPort: 4102,
    version: '1.0.0',
    latestVersion: '1.0.0',
    isUpdateAvailable: false,
    metadata: {
      author: 'developer',
      version: '1.0.0',
      tags: ['games', 'word-tile'],
      category: 'Custom',
    },
    changelog: [],
    appSystemInstructions: wordTileAppInstructions,
    isSystem: false,
  };

  appsService.createApp(app);
  ensureCatalogTagsAndLinkApp(APP_ID, [{ id: 'games' }]);

  const db = await AppDatabaseService.getInstance('word-tile');
  const dbOk = db.isValid();
  console.log(`Registered ${APP_ID}. Per-app DB initialized: ${dbOk}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
