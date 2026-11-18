import { databaseManager } from '@/backend/db/DatabaseManager';
import { appsService } from '@/backend/db/Apps/apps-service';

async function main(): Promise<void> {
  await databaseManager.initialize();
  for (const id of ['app-solitaire', 'app-word-tile']) {
    const a = appsService.getAppById(id);
    console.log(id, a ? { isEnabled: a.isEnabled, name: a.name } : 'NOT FOUND');
  }
}

main();
