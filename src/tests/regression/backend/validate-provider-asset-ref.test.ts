import { afterAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { LabIntegrationsError } from '@/backend/db/LabIntegrations/lab-integrations-service';
import {
  assertProviderAssetExists,
  setProviderAssetRefValidatorForTests,
} from '@/backend/lab-integrations/validate-provider-asset-ref';

describe('validate-provider-asset-ref', () => {
  afterAll(() => {
    setProviderAssetRefValidatorForTests(null);
  });

  test('rejects missing form when validator not bypassed', async () => {
    setProviderAssetRefValidatorForTests(null);
    const fb = betterSqlite3(':memory:');
    fb.exec(`
      CREATE TABLE forms (id INTEGER PRIMARY KEY, form_key TEXT UNIQUE, name TEXT, description TEXT,
        data_connector_id INTEGER, schema_json TEXT, components_json TEXT, validation_json TEXT,
        is_active INTEGER, created_at TEXT, updated_at TEXT);
    `);
    fb.close();

    await expect(
      assertProviderAssetExists('form.surface', 'app-lab-formsbuilder', 'missing-form-key'),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  test('test override allows binding tests without provider DB', async () => {
    setProviderAssetRefValidatorForTests(async () => {});
    await expect(
      assertProviderAssetExists('form.surface', 'app-lab-formsbuilder', 'any'),
    ).resolves.toBeUndefined();
  });

  test('override can simulate validation failure', async () => {
    setProviderAssetRefValidatorForTests(async () => {
      throw new LabIntegrationsError('simulated', 'VALIDATION');
    });
    await expect(
      assertProviderAssetExists('form.surface', 'app-lab-formsbuilder', 'x'),
    ).rejects.toThrow('simulated');
    setProviderAssetRefValidatorForTests(null);
  });
});
