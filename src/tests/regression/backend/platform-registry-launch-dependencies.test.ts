import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { labIntegrationsRepository } from '@/backend/db/LabIntegrations/lab-integrations-repository';
import {
  CANONICAL_CRM_DEPENDENCIES,
  CANONICAL_CRM_OPTIONAL_DEPENDENCIES,
  CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES,
} from '@/shared/config/platform-app-dependency-order';
import { verifyIntegrationBindingSeeds } from '@/backend/lab-integrations/verify-integration-seed-pack';

describe('platform registry launch dependencies', () => {
  test('Knowledge Base and CRM rows match canonical dependency lists after bootstrap', async () => {
    const db = new Database(':memory:');
    await appsRepository.bootstrap(db);
    await appsRepository.initialize();

    const kb = appsRepository.getAppsById('app-knowledge-base');
    expect(kb?.dependencies).toEqual([...CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES]);

    const crm = appsRepository.getAppsById('app-lab-crm');
    expect(crm?.dependencies).toEqual(
      expect.arrayContaining([...CANONICAL_CRM_DEPENDENCIES]),
    );
    for (const id of CANONICAL_CRM_DEPENDENCIES) {
      expect(crm?.dependencies).toContain(id);
    }
    for (const id of CANONICAL_CRM_OPTIONAL_DEPENDENCIES) {
      expect(crm?.optionalDependencies).toContain(id);
    }

    db.close();
  });

  test('CRM integration bindings cover accepted form slots after lab integrations init', async () => {
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY); INSERT INTO users (id) VALUES (1);`);
    await appsRepository.bootstrap(db);
    await appsRepository.initialize();
    await labIntegrationsRepository.bootstrap(db);
    await labIntegrationsRepository.initialize();

    const { errors } = verifyIntegrationBindingSeeds(db);
    const crmErrors = errors.filter((line) => line.includes('app-lab-crm'));
    expect(crmErrors).toEqual([]);

    const crmBindingCount = (
      db
        .prepare(`SELECT COUNT(*) AS c FROM lab_integration_bindings WHERE host_app_id = ?`)
        .get('app-lab-crm') as { c: number }
    ).c;
    expect(crmBindingCount).toBeGreaterThan(0);

    db.close();
  });
});
