import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import {
  verifyIntegrationBindingSeeds,
  verifyIntegrationManifestSeeds,
  verifyIntegrationSeedPackFromBootstrap,
} from '@/backend/lab-integrations/verify-integration-seed-pack';

/**
 * Slots each pilot host declares in its own manifest — every one must end up bound.
 *
 * Chart Builder appears here because it is a **provider that is also a host**: it ships the
 * connector dialogs on its own *Manage data connectors* view but was in neither the catalog host
 * list nor the platform host list, so nothing seeded those slots and every connector's **Edit**
 * button showed an unbound-slot hint.
 */
const PILOT_HOST_SLOTS: Record<string, readonly string[]> = {
  'app-lab-chartbuilder': [
    'chart.connector.create.dialog',
    'chart.connector.edit.dialog',
    'chart.connector.delete.dialog',
  ],
  'app-lab-tasklist': [
    'task.create.dialog',
    'task.edit.dialog',
    'task.delete.dialog',
    'task-list.create.dialog',
    'task-list.edit.dialog',
    'task-list.delete.dialog',
    'reports.by-status',
    'reports.by-priority',
  ],
  'app-lab-helpdesk': [
    'ticket.create.dialog',
    'ticket.edit.dialog',
    'ticket.delete.dialog',
    'kanban.board.create.dialog',
    'kanban.board.edit.dialog',
    'kanban.board.delete.dialog',
    'reports.by-status',
    'reports.by-priority',
    'reports.queue-funnel',
    'reports.priority-breakdown',
  ],
};

describe('integration seed pack (phase 10)', () => {
  test('fresh bootstrap passes manifest + binding verification', async () => {
    const result = await verifyIntegrationSeedPackFromBootstrap();
    for (const warning of result.warnings) {
      // Catalog chart/form stubs may warn when app DB files are absent in CI — not a failure.
      console.warn(`[lab-integrations-seed-pack] ${warning}`);
    }
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.bindingCount).toBeGreaterThan(0);
  });

  describe('manifest seeds (apps bootstrap)', () => {
    beforeAll(async () => {
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(':memory:');
      db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY); INSERT INTO users (id) VALUES (1);`);
      const { appsRepository } = await import('@/backend/db/Apps/apps-repository');
      await appsRepository.bootstrap(db);
      await appsRepository.initialize();
    });

    afterAll(async () => {
      const { appsRepository } = await import('@/backend/db/Apps/apps-repository');
      appsRepository.close();
    });

    test('every golden host has accepts + integrationServices', () => {
      expect(verifyIntegrationManifestSeeds()).toEqual([]);
    });
  });
});

describe('pilot host seeds (Task List / Help Desk)', () => {
  beforeAll(async () => {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY); INSERT INTO users (id) VALUES (1);`);
    const { appsRepository } = await import('@/backend/db/Apps/apps-repository');
    const { labIntegrationsRepository } = await import(
      '@/backend/db/LabIntegrations/lab-integrations-repository'
    );
    await appsRepository.bootstrap(db);
    await appsRepository.initialize();
    await labIntegrationsRepository.bootstrap(db);
    await labIntegrationsRepository.initialize();
  });

  afterAll(async () => {
    const { appsRepository } = await import('@/backend/db/Apps/apps-repository');
    const { labIntegrationsRepository } = await import(
      '@/backend/db/LabIntegrations/lab-integrations-repository'
    );
    labIntegrationsRepository.close();
    appsRepository.close();
  });

  test.each(Object.entries(PILOT_HOST_SLOTS))(
    '%s binds every slot its manifest accepts',
    async (hostAppId, slots) => {
      const { labIntegrationsRepository } = await import(
        '@/backend/db/LabIntegrations/lab-integrations-repository'
      );
      const boundSlots = new Set(
        labIntegrationsRepository.listByHost(hostAppId).map((row) => row.slot),
      );
      for (const slot of slots) {
        expect(boundSlots).toContain(slot);
      }
    },
  );

  /**
   * The designer slots are deliberately **not** seeded.
   *
   * `chart.designer.metadata` and `chart.designer.connector` are rendered inline by the app's own
   * `ChartDesignerForm`. Binding them would replace a working native editor with a generated stub,
   * so the seeder allowlists only the connector slots. This assertion is what stops a future
   * "seed every form.surface" refactor from quietly doing that.
   */
  test('chart builder designer slots stay unbound (native form owns them)', async () => {
    const { labIntegrationsRepository } = await import(
      '@/backend/db/LabIntegrations/lab-integrations-repository'
    );
    const boundSlots = new Set(
      labIntegrationsRepository.listByHost('app-lab-chartbuilder').map((row) => row.slot),
    );
    expect(boundSlots).not.toContain('chart.designer.metadata');
    expect(boundSlots).not.toContain('chart.designer.connector');
  });

  test('pilot bindings are seed-authored and enabled', async () => {
    const { labIntegrationsRepository } = await import(
      '@/backend/db/LabIntegrations/lab-integrations-repository'
    );
    for (const hostAppId of Object.keys(PILOT_HOST_SLOTS)) {
      const rows = labIntegrationsRepository.listByHost(hostAppId);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.id.startsWith('seed-binding-')).toBe(true);
        expect(row.enabled).toBe(true);
        // Without a resolved provider ref the dialog renders empty.
        expect(row.providerRef.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('accepted form slots are bound (regression guard)', () => {
  /**
   * The guard that would have caught the Chart Builder and CRM defects.
   *
   * Both shipped with slots declared in the manifest but no binding, because the existing checks only
   * asserted a host had *some* binding. Chart Builder's connector **Edit** and CRM's per-entity
   * **New/Edit/Delete** were silently inert as a result.
   */
  test('fresh bootstrap binds every accepted form slot it does not explicitly except', async () => {
    const { verifyIntegrationSeedPackFromBootstrap } = await import(
      '@/backend/lab-integrations/verify-integration-seed-pack'
    );
    const result = await verifyIntegrationSeedPackFromBootstrap();
    const unbound = result.errors.filter((e) => e.includes('has no enabled binding'));
    expect(unbound).toEqual([]);
  });

  test('chart builder designer slots are the only intentional exception', async () => {
    const { verifyIntegrationSeedPackFromBootstrap } = await import(
      '@/backend/lab-integrations/verify-integration-seed-pack'
    );
    const result = await verifyIntegrationSeedPackFromBootstrap();
    // No error should mention the designer slots: they are excepted, not broken.
    expect(result.errors.filter((e) => e.includes('chart.designer')).length).toBe(0);
  });
});

describe('verifyIntegrationBindingSeeds', () => {
  test('flags hosts with zero bindings', async () => {
    const Database = (await import('better-sqlite3')).default;
    const { bootstrapLabIntegrationsSchema } = await import(
      '@/backend/db/LabIntegrations/lab-integrations-schema'
    );
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY); INSERT INTO users (id) VALUES (1);`);
    bootstrapLabIntegrationsSchema(db);

    const { errors } = verifyIntegrationBindingSeeds(db);
    expect(errors.some((e) => e.includes('app-lab-crm'))).toBe(true);
  });
});
