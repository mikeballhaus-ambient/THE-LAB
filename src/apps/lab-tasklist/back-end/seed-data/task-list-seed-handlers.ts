import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import type { AppSeedDataHandlers } from '@/shared/server/register-app-seed-data-routes';
import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import {
  countDemoTasks,
  hasTaskListDemoDataset,
  removeDemoTasks,
  seedDemoTasksIfMissing,
  TASK_LIST_DEMO_PACK_ID,
} from '../db/seed-demo-tasks';

export const taskListSeedHandlers: AppSeedDataHandlers = {
  appId: 'app-lab-tasklist',

  async getStatus(): Promise<AppSeedPackStatus[]> {
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    const present = hasTaskListDemoDataset(db);
    const demoCount = countDemoTasks(db);
    return [
      {
        packId: TASK_LIST_DEMO_PACK_ID,
        present,
        rowCount: demoCount,
        serverReachable: true,
        message: present
          ? undefined
          : 'Demo pack not applied — use Apply to add sample lists and tasks (your lists are kept).',
      },
    ];
  },

  async applyPack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== TASK_LIST_DEMO_PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    try {
      syncAppSeedBootFlagForPack(db, 'app-lab-tasklist', TASK_LIST_DEMO_PACK_ID, false);
      const { insertedLists, insertedTasks } = seedDemoTasksIfMissing(db, { adminApply: true });
      if (insertedLists === 0 && insertedTasks === 0 && hasTaskListDemoDataset(db)) {
        syncAppSeedBootFlagForPack(db, 'app-lab-tasklist', TASK_LIST_DEMO_PACK_ID, false);
        return { success: true, content: 'Task List demo data is already present.' };
      }
      if (hasTaskListDemoDataset(db)) {
        syncAppSeedBootFlagForPack(db, 'app-lab-tasklist', TASK_LIST_DEMO_PACK_ID, false);
      }
      return {
        success: hasTaskListDemoDataset(db),
        content: `Inserted ${insertedLists} list(s) and ${insertedTasks} demo task(s).`,
      };
    } catch (err) {
      return {
        success: false,
        content: err instanceof Error ? err.message : 'Failed to apply demo tasks',
      };
    }
  },

  async removePack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== TASK_LIST_DEMO_PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    const { removedTasks, removedLists } = removeDemoTasks(db);
    syncAppSeedBootFlagForPack(db, 'app-lab-tasklist', TASK_LIST_DEMO_PACK_ID, true);
    return {
      success: true,
      content: `Removed ${removedTasks} demo task(s) and ${removedLists} empty demo list(s). User-created tasks and lists were not changed.`,
    };
  },
};
