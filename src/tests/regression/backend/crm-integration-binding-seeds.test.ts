import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { bootstrapLabIntegrationsSchema } from '@/backend/db/LabIntegrations/lab-integrations-schema';
import {
  CRM_TASK_INTEGRATION_FORM_KEY,
  CRM_TICKET_INTEGRATION_FORM_KEY,
  syncCrmQuotesIntegrationBindingSeeds,
  syncCrmTaskIntegrationBindingSeeds,
  syncCrmTicketIntegrationBindingSeeds,
  syncCrmApprovalIntegrationBindingSeeds,
  syncCrmLedgerIntegrationBindingSeeds,
} from '@/backend/db/LabIntegrations/crm-integration-binding-seeds';
import { platformCatalogFormKey } from '@/shared/config/platform-catalog-form-keys';
import { CRM_APPROVAL_INTEGRATION_SLOTS } from '@/apps/lab-crm/shared/constants/crm-integration-slots';

describe('syncCrmQuotesIntegrationBindingSeeds', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      INSERT INTO users (id) VALUES (1);
    `);
    bootstrapLabIntegrationsSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  test('inserts quotes dialog bindings when missing', async () => {
    await syncCrmQuotesIntegrationBindingSeeds(db);
    const rows = db
      .prepare(`SELECT slot, provider_ref FROM lab_integration_bindings WHERE host_app_id = 'app-lab-crm'`)
      .all() as { slot: string; provider_ref: string }[];
    expect(rows.map((r) => r.slot).sort()).toEqual([
      'crm.quotes.create.dialog',
      'crm.quotes.delete.dialog',
      'crm.quotes.edit.dialog',
    ]);
    expect(rows.every((r) => r.provider_ref === 'form_1790963590212_43zxb2u')).toBe(true);
  });

  test('does not duplicate existing slot bindings', async () => {
    await syncCrmQuotesIntegrationBindingSeeds(db);
    await syncCrmQuotesIntegrationBindingSeeds(db);
    const { c } = db.prepare(`SELECT COUNT(*) AS c FROM lab_integration_bindings`).get() as {
      c: number;
    };
    expect(c).toBe(3);
  });
});

describe('syncCrmTaskIntegrationBindingSeeds', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      INSERT INTO users (id) VALUES (1);
    `);
    bootstrapLabIntegrationsSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  test('inserts crm.task.* dialog bindings', async () => {
    await syncCrmTaskIntegrationBindingSeeds(db);
    const rows = db
      .prepare(`SELECT slot, provider_ref FROM lab_integration_bindings WHERE host_app_id = 'app-lab-crm'`)
      .all() as { slot: string; provider_ref: string }[];
    expect(rows.map((r) => r.slot).sort()).toEqual([
      'crm.task.create.dialog',
      'crm.task.delete.dialog',
      'crm.task.edit.dialog',
    ]);
    expect(rows.every((r) => r.provider_ref === CRM_TASK_INTEGRATION_FORM_KEY)).toBe(true);
  });
});

describe('syncCrmTicketIntegrationBindingSeeds', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      INSERT INTO users (id) VALUES (1);
    `);
    bootstrapLabIntegrationsSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  test('inserts crm.ticket.* dialog bindings', async () => {
    await syncCrmTicketIntegrationBindingSeeds(db);
    const rows = db
      .prepare(`SELECT slot, provider_ref FROM lab_integration_bindings WHERE host_app_id = 'app-lab-crm'`)
      .all() as { slot: string; provider_ref: string }[];
    expect(rows.map((r) => r.slot).sort()).toEqual([
      'crm.ticket.create.dialog',
      'crm.ticket.delete.dialog',
      'crm.ticket.edit.dialog',
    ]);
    expect(rows.every((r) => r.provider_ref === CRM_TICKET_INTEGRATION_FORM_KEY)).toBe(true);
  });
});

describe('syncCrmApprovalIntegrationBindingSeeds', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      INSERT INTO users (id) VALUES (1);
    `);
    bootstrapLabIntegrationsSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  test('inserts crm.approval decide dialog binding only', async () => {
    await syncCrmApprovalIntegrationBindingSeeds(db);
    const decideKey = platformCatalogFormKey(
      'app-lab-crm',
      CRM_APPROVAL_INTEGRATION_SLOTS.decide,
    );
    const rows = db
      .prepare(`SELECT slot, provider_ref FROM lab_integration_bindings WHERE host_app_id = 'app-lab-crm'`)
      .all() as { slot: string; provider_ref: string }[];
    expect(rows.map((r) => r.slot).sort()).toEqual(['crm.approval.request.decide.dialog']);
    const bySlot = new Map(rows.map((r) => [r.slot, r.provider_ref]));
    expect(bySlot.get('crm.approval.request.decide.dialog')).toBe(decideKey);
  });
});

describe('syncCrmLedgerIntegrationBindingSeeds', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      INSERT INTO users (id) VALUES (1);
    `);
    bootstrapLabIntegrationsSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  test('inserts crm.ledger account create binding only', async () => {
    await syncCrmLedgerIntegrationBindingSeeds(db);
    const rows = db
      .prepare(`SELECT slot FROM lab_integration_bindings WHERE host_app_id = 'app-lab-crm'`)
      .all() as { slot: string }[];
    expect(rows.map((r) => r.slot).sort()).toEqual(['crm.ledger.account.create.dialog']);
  });
});
