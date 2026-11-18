import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import type { AppSeedDataHandlers } from '@/shared/server/register-app-seed-data-routes';
import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import {
  clearAllChartBuilderCatalog,
  SEED_CHART_DEFINITIONS,
  seedChartsIfMissing,
} from '../../db/seed-charts';

/**
 * Settings → App demo data handler for the `chart-samples` pack.
 *
 * Applies/removes the shared `chart_seed_*` definitions that CRM, Task List and Help Desk
 * dashboards bind to. The main backend also seeds these directly
 * (`app-seed-data-direct.ts`) so a cold Chart Builder is not required.
 */

export const CHART_SAMPLES_PACK_ID = 'chart-samples';

function getDb() {
  return AppDatabaseServiceProxy.getInstance().getDb();
}

function countPresentCharts(): number {
  const repo = AppDatabaseServiceProxy.getInstance().getChartsRepository();
  return SEED_CHART_DEFINITIONS.filter((def) => repo.findByKey(def.chartKey)).length;
}

export const chartBuilderSeedHandlers: AppSeedDataHandlers = {
  appId: 'app-lab-chartbuilder',

  async getStatus(): Promise<AppSeedPackStatus[]> {
    const present = countPresentCharts();
    return [
      {
        packId: CHART_SAMPLES_PACK_ID,
        present: present >= SEED_CHART_DEFINITIONS.length,
        rowCount: present,
        serverReachable: true,
        message:
          present >= SEED_CHART_DEFINITIONS.length
            ? undefined
            : `Platform chart definitions: ${present}/${SEED_CHART_DEFINITIONS.length} present.`,
      },
    ];
  },

  async applyPack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== CHART_SAMPLES_PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    try {
      const db = getDb();
      syncAppSeedBootFlagForPack(db, 'app-lab-chartbuilder', CHART_SAMPLES_PACK_ID, false);
      const inserted = seedChartsIfMissing(AppDatabaseServiceProxy.getInstance().getChartsRepository(), {
        adminApply: true,
        db,
      });
      const present = countPresentCharts();
      return {
        success: present >= SEED_CHART_DEFINITIONS.length,
        content:
          inserted > 0
            ? `Inserted ${inserted} chart definition(s).`
            : `Platform chart definitions already present (${present}/${SEED_CHART_DEFINITIONS.length}).`,
      };
    } catch (err) {
      return {
        success: false,
        content: err instanceof Error ? err.message : 'Failed to apply chart samples',
      };
    }
  },

  async removePack(packId: string): Promise<AppSeedOperationResult> {
    if (packId !== CHART_SAMPLES_PACK_ID) {
      return { success: false, content: `Unknown pack: ${packId}` };
    }
    const db = getDb();
    const removed = clearAllChartBuilderCatalog(db);
    syncAppSeedBootFlagForPack(db, 'app-lab-chartbuilder', CHART_SAMPLES_PACK_ID, true);
    return {
      success: true,
      content: `Removed ${removed.removedCharts} chart(s) and ${removed.removedConnectors} connector(s).`,
    };
  },
};
