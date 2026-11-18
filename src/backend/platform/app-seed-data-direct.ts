import type { Database } from 'better-sqlite3';
import { AppDatabaseManager } from '../AppDatabaseManager';
import type { AppSeedOperationResult } from '@/shared/types/app/app-seed-data';
import { packAllowsRemove } from '@/shared/config/app-seed-data-registry';
import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';
import { resolveAppDatabaseFolderId } from './app-seed-data-db-id';
import {
  DEMO_HERO_EMAIL_MARKER,
  hasDemoDataset,
  removeDemoRecords,
  seedDemoRecords,
} from '@/apps/lab-crm/back-end/db/seed-demo-records';
import {
  hasTaskListDemoDataset,
  removeDemoTasks,
  seedDemoTasksIfMissing,
  TASK_LIST_DEMO_PACK_ID,
} from '@/apps/lab-tasklist/back-end/db/seed-demo-tasks';
import {
  hasHelpDeskDemoTickets,
  HELP_DESK_DEMO_TICKETS_PACK_ID,
  removeDemoTickets,
  seedDemoTicketsIfMissing,
} from '@/apps/lab-helpdesk/back-end/db/seed-demo-tickets';
import { ensureHelpDeskCoreSchema } from '@/apps/lab-helpdesk/back-end/db/ensure-help-desk-schema';
import {
  countSystemKanbanBoards,
  seedKanbanSystemBoardsIfMissing,
} from '@/apps/lab-helpdesk/back-end/db/seed-kanban-defaults';
import {
  clearAllFormsBuilderCatalog,
  hasPlatformFormsDataset,
  PLATFORM_FORMS_PACK_ID,
  REQUIRED_PLATFORM_FORM_KEYS,
  seedPlatformFormsIfMissing,
} from '@/apps/lab-formsbuilder/back-end/db/seed-platform-forms';
import {
  clearAllChartBuilderCatalog,
  SEED_CHART_DEFINITIONS,
  seedChartsIfMissing,
} from '@/apps/lab-chartbuilder/db/seed-charts';
import { ChartsRepository } from '@/apps/lab-chartbuilder/db/repositories';
import {
  executeCatalogDemoSeedPack,
  isCatalogDemoSeedAppId,
} from './catalog-demo-seed-direct';

const CRM_PACK_ID = 'crm-demo-records';
const CHART_PACK_ID = 'chart-samples';
const KANBAN_PACK_ID = 'kanban-defaults';

async function openAppDb(registryAppId: string): Promise<Database> {
  const dbId = resolveAppDatabaseFolderId(registryAppId);
  return AppDatabaseManager.getInstance().getConnection(dbId);
}

function ensureChartBuilderTables(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      chart_type TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '{}',
      layout_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_charts_chart_key ON charts(chart_key);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_charts_is_active ON charts(is_active);`);
}

function countSeedCharts(db: Database): number {
  const repo = new ChartsRepository(db);
  let count = 0;
  for (const def of SEED_CHART_DEFINITIONS) {
    if (repo.findByKey(def.chartKey)) {
      count += 1;
    }
  }
  return count;
}

function countPresentForms(db: Database): number {
  let count = 0;
  for (const key of REQUIRED_PLATFORM_FORM_KEYS) {
    if (db.prepare('SELECT 1 FROM forms WHERE form_key = ?').get(key)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Apply/remove seed packs against the on-disk app SQLite file (no app server required).
 */
export async function executeAppSeedPackDirect(
  registryAppId: string,
  packId: string,
  action: 'apply' | 'remove',
): Promise<AppSeedOperationResult> {
  if (action === 'remove' && !packAllowsRemove(registryAppId, packId)) {
    return {
      success: false,
      content: 'This pack is required platform infrastructure and cannot be removed.',
    };
  }

  const db = await openAppDb(registryAppId);

  if (isCatalogDemoSeedAppId(registryAppId)) {
    return executeCatalogDemoSeedPack(db, registryAppId, packId, action);
  }

  switch (registryAppId) {
    case 'app-lab-tasklist':
      if (packId !== TASK_LIST_DEMO_PACK_ID) {
        return { success: false, content: `Unknown pack: ${packId}` };
      }
      if (action === 'remove') {
        const { removedTasks, removedLists } = removeDemoTasks(db);
        syncAppSeedBootFlagForPack(db, registryAppId, packId, true);
        return {
          success: true,
          content: `Removed ${removedTasks} demo task(s) and ${removedLists} empty demo list(s). User-created tasks and lists were not changed.`,
        };
      }
      syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
      const { insertedLists, insertedTasks } = seedDemoTasksIfMissing(db, { adminApply: true });
      if (hasTaskListDemoDataset(db)) {
        syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
      }
      return {
        success: hasTaskListDemoDataset(db),
        content:
          insertedLists === 0 && insertedTasks === 0 && hasTaskListDemoDataset(db)
            ? 'Task List demo data is already present.'
            : `Inserted ${insertedLists} list(s) and ${insertedTasks} demo task(s).`,
      };

    case 'app-lab-crm':
      if (packId !== CRM_PACK_ID) {
        return { success: false, content: `Unknown pack: ${packId}` };
      }
      if (action === 'remove') {
        const result = removeDemoRecords(db);
        if (!result.success) {
          return { success: false, content: result.message };
        }
        syncAppSeedBootFlagForPack(db, registryAppId, packId, true);
        return {
          success: true,
          content: result.removed > 0
            ? `Removed ${result.removed} CRM demo entity record(s).`
            : 'No CRM demo dataset was present.',
        };
      }
      if (hasDemoDataset(db)) {
        syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
        return { success: true, content: 'CRM demo records are already present.' };
      }
      const { c: recordCount } = db.prepare('SELECT COUNT(*) AS c FROM entity_records').get() as { c: number };
      if (recordCount > 0) {
        return {
          success: false,
          content:
            'CRM already has non-demo entity records. Remove production data manually or use an empty CRM database before applying demo records.',
        };
      }
      syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
      seedDemoRecords(db, { adminApply: true });
      if (!hasDemoDataset(db)) {
        return { success: false, content: 'Demo seed did not apply — check server logs.' };
      }
      syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
      return {
        success: true,
        content: `Applied CRM demo records. Marker: ${DEMO_HERO_EMAIL_MARKER}`,
      };

    case 'app-lab-helpdesk':
      if (packId === KANBAN_PACK_ID) {
        if (action === 'remove') {
          const result = db.prepare('DELETE FROM kanban_boards WHERE is_system = 1').run();
          syncAppSeedBootFlagForPack(db, registryAppId, packId, true);
          return {
            success: true,
            content: result.changes > 0
              ? `Removed ${result.changes} system kanban board(s).`
              : 'No system kanban boards were present.',
          };
        }
        ensureHelpDeskCoreSchema(db);
        if (countSystemKanbanBoards(db) > 0) {
          syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
          return {
            success: true,
            content: `Default kanban boards present (${countSystemKanbanBoards(db)}).`,
          };
        }
        syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
        const boardsInserted = seedKanbanSystemBoardsIfMissing(db, { adminApply: true });
        const systemCount = countSystemKanbanBoards(db);
        return {
          success: systemCount > 0,
          content:
            boardsInserted > 0
              ? `Inserted ${boardsInserted} system kanban board(s).`
              : systemCount > 0
                ? `Default kanban boards present (${systemCount}).`
                : 'Kanban defaults could not be applied — check server logs.',
        };
      }
      if (packId === HELP_DESK_DEMO_TICKETS_PACK_ID) {
        if (action === 'remove') {
          const removed = removeDemoTickets(db);
          syncAppSeedBootFlagForPack(db, registryAppId, packId, true);
          return {
            success: true,
            content: removed > 0 ? `Removed ${removed} demo ticket(s).` : 'No demo tickets were present.',
          };
        }
        ensureHelpDeskCoreSchema(db);
        syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
        const inserted = seedDemoTicketsIfMissing(db, { adminApply: true });
        if (hasHelpDeskDemoTickets(db)) {
          syncAppSeedBootFlagForPack(db, registryAppId, packId, false);
        }
        return {
          success: hasHelpDeskDemoTickets(db),
          content:
            inserted === 0 && hasHelpDeskDemoTickets(db)
              ? 'Help Desk demo tickets are already present.'
              : `Inserted ${inserted} demo ticket(s).`,
        };
      }
      return { success: false, content: `Unknown pack: ${packId}` };

    case 'app-lab-chartbuilder':
      if (packId !== CHART_PACK_ID) {
        return { success: false, content: `Unknown pack: ${packId}` };
      }
      if (action === 'remove') {
        const removed = clearAllChartBuilderCatalog(db);
        syncAppSeedBootFlagForPack(db, 'app-lab-chartbuilder', CHART_PACK_ID, true);
        return {
          success: true,
          content: `Removed ${removed.removedCharts} chart(s) and ${removed.removedConnectors} connector(s).`,
        };
      }
      ensureChartBuilderTables(db);
      syncAppSeedBootFlagForPack(db, 'app-lab-chartbuilder', CHART_PACK_ID, false);
      const repo = new ChartsRepository(db);
      seedChartsIfMissing(repo, { adminApply: true, db });
      const count = countSeedCharts(db);
      return {
        success: count >= SEED_CHART_DEFINITIONS.length,
        content: `Platform chart definitions: ${count}/${SEED_CHART_DEFINITIONS.length} present.`,
      };

    case 'app-lab-formsbuilder':
      if (packId !== PLATFORM_FORMS_PACK_ID) {
        return { success: false, content: `Unknown pack: ${packId}` };
      }
      if (action === 'remove') {
        const removed = clearAllFormsBuilderCatalog(db);
        syncAppSeedBootFlagForPack(db, 'app-lab-formsbuilder', PLATFORM_FORMS_PACK_ID, true);
        return {
          success: true,
          content: `Removed ${removed.removedForms} form(s), ${removed.removedConnectors} connector(s), ${removed.removedSubmissions} submission(s).`,
        };
      }
      syncAppSeedBootFlagForPack(db, 'app-lab-formsbuilder', PLATFORM_FORMS_PACK_ID, false);
      const { insertedConnectors, insertedForms } = seedPlatformFormsIfMissing(db, { adminApply: true });
      const present = hasPlatformFormsDataset(db);
      return {
        success: present,
        content: present
          ? `Platform forms ready (${countPresentForms(db)}/${REQUIRED_PLATFORM_FORM_KEYS.length} required keys). Inserted ${insertedConnectors} connector(s), ${insertedForms} form(s).`
          : 'Apply finished but some required form keys are still missing.',
      };

    default:
      return { success: false, content: `No direct seed handler for app ${registryAppId}` };
  }
}
