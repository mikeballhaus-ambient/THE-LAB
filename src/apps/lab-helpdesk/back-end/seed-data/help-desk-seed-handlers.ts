import { syncAppSeedBootFlagForPack } from '@/shared/config/app-seed-boot-flags';
import type { AppSeedOperationResult, AppSeedPackStatus } from '@/shared/types/app/app-seed-data';
import type { AppSeedDataHandlers } from '@/shared/server/register-app-seed-data-routes';
import { AppDatabaseServiceProxy } from '../../db/app-db-service';
import { seedKanbanSystemBoardsIfMissing } from '../db/seed-kanban-defaults';
import {
  hasHelpDeskDemoTickets,
  HELP_DESK_DEMO_TICKETS_PACK_ID,
  removeDemoTickets,
  seedDemoTicketsIfMissing,
} from '../db/seed-demo-tickets';

const KANBAN_PACK_ID = 'kanban-defaults';

function countSystemBoards(db: ReturnType<AppDatabaseServiceProxy['getDb']>): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM kanban_boards WHERE is_system = 1').get() as {
    c: number;
  };
  return row.c;
}

export const helpDeskSeedHandlers: AppSeedDataHandlers = {
  appId: 'app-lab-helpdesk',

  async getStatus(): Promise<AppSeedPackStatus[]> {
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    const ticketRow = db
      .prepare(`SELECT COUNT(*) AS c FROM tickets WHERE metadata LIKE ?`)
      .get(`%${HELP_DESK_DEMO_TICKETS_PACK_ID}%`) as { c: number };
    return [
      {
        packId: KANBAN_PACK_ID,
        present: countSystemBoards(db) > 0,
        rowCount: countSystemBoards(db),
        serverReachable: true,
      },
      {
        packId: HELP_DESK_DEMO_TICKETS_PACK_ID,
        present: hasHelpDeskDemoTickets(db),
        rowCount: ticketRow.c,
        serverReachable: true,
      },
    ];
  },

  async applyPack(packId: string): Promise<AppSeedOperationResult> {
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    if (packId === KANBAN_PACK_ID) {
      syncAppSeedBootFlagForPack(db, 'app-lab-helpdesk', KANBAN_PACK_ID, false);
      const boardsInserted = seedKanbanSystemBoardsIfMissing(db, { adminApply: true });
      const count = countSystemBoards(db);
      if (count > 0) {
        syncAppSeedBootFlagForPack(db, 'app-lab-helpdesk', KANBAN_PACK_ID, false);
      }
      return {
        success: count > 0,
        content:
          boardsInserted > 0
            ? `Inserted ${boardsInserted} system kanban board(s).`
            : count > 0
              ? `Default kanban boards present (${count}).`
              : 'No kanban boards were seeded.',
      };
    }
    if (packId === HELP_DESK_DEMO_TICKETS_PACK_ID) {
      syncAppSeedBootFlagForPack(db, 'app-lab-helpdesk', HELP_DESK_DEMO_TICKETS_PACK_ID, false);
      const inserted = seedDemoTicketsIfMissing(db, { adminApply: true });
      if (inserted === 0 && hasHelpDeskDemoTickets(db)) {
        syncAppSeedBootFlagForPack(db, 'app-lab-helpdesk', HELP_DESK_DEMO_TICKETS_PACK_ID, false);
        return { success: true, content: 'Help Desk demo tickets are already present.' };
      }
      if (hasHelpDeskDemoTickets(db)) {
        syncAppSeedBootFlagForPack(db, 'app-lab-helpdesk', HELP_DESK_DEMO_TICKETS_PACK_ID, false);
      }
      return {
        success: hasHelpDeskDemoTickets(db),
        content: `Inserted ${inserted} demo ticket(s).`,
      };
    }
    return { success: false, content: `Unknown pack: ${packId}` };
  },

  async removePack(packId: string): Promise<AppSeedOperationResult> {
    const db = AppDatabaseServiceProxy.getInstance().getDb();
    if (packId === KANBAN_PACK_ID) {
      const result = db.prepare('DELETE FROM kanban_boards WHERE is_system = 1').run();
      syncAppSeedBootFlagForPack(db, 'app-lab-helpdesk', KANBAN_PACK_ID, true);
      return {
        success: true,
        content: result.changes > 0
          ? `Removed ${result.changes} system kanban board(s).`
          : 'No system kanban boards were present.',
      };
    }
    if (packId === HELP_DESK_DEMO_TICKETS_PACK_ID) {
      const removed = removeDemoTickets(db);
      syncAppSeedBootFlagForPack(db, 'app-lab-helpdesk', HELP_DESK_DEMO_TICKETS_PACK_ID, true);
      return {
        success: true,
        content: removed > 0 ? `Removed ${removed} demo ticket(s).` : 'No demo tickets were present.',
      };
    }
    return { success: false, content: `Unknown pack: ${packId}` };
  },
};
