/**
 * One-shot registry insert for app-solitaire when src/apps/solitaire already exists.
 * Same data path as App Management create_app DB + catalog tags — no TemplateGenerator file scaffold.
 *
 * Usage: npx tsx src/scripts/register-solitaire-app-once.ts
 */
import { databaseManager } from '@/backend/db/DatabaseManager';
import { appsService } from '@/backend/db/Apps/apps-service';
import { ensureCatalogTagsAndLinkApp } from '@/backend/db/AppTags/ensure-catalog-tags-for-app';
import { solitaireAppInstructions } from '@/backend/db/Apps/app-instructions/solitaire-app-instructions';
import { SOLITAIRE_APP_DESCRIPTION } from '@/backend/db/Apps/catalog-app-registration-specs';
import type { IApp } from '@/shared/types/app/app.d';
import { AppDatabaseService } from '@/backend/AppDatabaseService';

const APP_ID = 'app-solitaire';

async function main(): Promise<void> {
  await databaseManager.initialize();

  const existing = appsService.getAppById(APP_ID);
  if (existing) {
    console.log(`Already registered: ${existing.id} (${existing.name}), port ${existing.server?.port ?? 'n/a'}`);
    process.exit(0);
  }

  const app: IApp = {
    id: APP_ID,
    name: 'Solitaire',
    description: SOLITAIRE_APP_DESCRIPTION,
    type: 'hybrid',
    componentPath: '/src/apps/solitaire/front-end/App.vue',
    isServerSideEnabled: true,
    isEnabled: true,
    order: 21,
    faIcon: 'fa-clone',
    server: {
      entry: '/src/apps/solitaire/back-end/entry.ts',
      port: 4101,
      env: { NODE_ENV: 'development' },
    },
    dependencies: [],
    optionalDependencies: [],
    requiresPort: 4101,
    version: '1.0.0',
    latestVersion: '1.0.0',
    isUpdateAvailable: false,
    metadata: {
      author: 'developer',
      version: '1.0.0',
      tags: ['games', 'solitaire'],
      category: 'Custom',
    },
    changelog: [],
    appSystemInstructions: solitaireAppInstructions,
    isSystem: false,
  };

  appsService.createApp(app);
  ensureCatalogTagsAndLinkApp(APP_ID, [{ id: 'games' }]);

  const db = await AppDatabaseService.getInstance('solitaire');
  const dbOk = db.isValid();
  console.log(`Registered ${APP_ID}. Per-app DB initialized: ${dbOk}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
