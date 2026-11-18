import { describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { bootstrapCrmDatabase } from '@/apps/lab-crm/back-end/db/bootstrap';
import { hasDemoDataset } from '@/apps/lab-crm/back-end/db/seed-demo-records';
import { refreshCrmDemoOnAppBoot } from '@/apps/lab-crm/back-end/db/seed-crm-demo-boot';

describe('refreshCrmDemoOnAppBoot', () => {
  test('replaces demo rows and clears approvalStatus mutations on relaunch', async () => {
    const db = betterSqlite3(':memory:');
    await bootstrapCrmDatabase(db);
    expect(hasDemoDataset(db)).toBe(true);

    const salesDef = db
      .prepare(`SELECT id FROM entity_definitions WHERE entity_key = 'sales' LIMIT 1`)
      .get() as { id: number };
    const sale = db
      .prepare(
        `SELECT id, data_json FROM entity_records WHERE entity_definition_id = ? ORDER BY id ASC LIMIT 1`,
      )
      .get(salesDef.id) as { id: number; data_json: string };
    const data = JSON.parse(sale.data_json) as Record<string, unknown>;
    data.approvalStatus = 'pending';
    db.prepare(`UPDATE entity_records SET data_json = ? WHERE id = ?`).run(
      JSON.stringify(data),
      sale.id,
    );

    const first = refreshCrmDemoOnAppBoot(db);
    expect(first.reseeded).toBe(true);

    const after = db
      .prepare(
        `SELECT data_json FROM entity_records WHERE entity_definition_id = ? ORDER BY id ASC LIMIT 1`,
      )
      .get(salesDef.id) as { data_json: string };
    const parsed = JSON.parse(after.data_json) as Record<string, unknown>;
    expect(parsed.approvalStatus).toBeUndefined();
    expect(hasDemoDataset(db)).toBe(true);
  });
});
