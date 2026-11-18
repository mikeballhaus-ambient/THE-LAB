import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  backfillAccountsFromContactCompanies,
  listContactCompanyNames,
} from '@/apps/lab-crm/back-end/db/backfill-accounts';

function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE entity_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );
    CREATE TABLE entity_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_definition_id INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.prepare('INSERT INTO entity_definitions (entity_key, name) VALUES (?, ?)').run(
    'accounts',
    'Accounts',
  );
  db.prepare('INSERT INTO entity_definitions (entity_key, name) VALUES (?, ?)').run(
    'contacts',
    'Contacts',
  );
}

function insertContact(db: Database.Database, data: Record<string, unknown>): number {
  const def = db
    .prepare('SELECT id FROM entity_definitions WHERE entity_key = ?')
    .get('contacts') as { id: number };
  const result = db
    .prepare('INSERT INTO entity_records (entity_definition_id, data_json) VALUES (?, ?)')
    .run(def.id, JSON.stringify(data));
  return Number(result.lastInsertRowid);
}

function readRecord(db: Database.Database, id: number): Record<string, unknown> {
  const row = db.prepare('SELECT data_json FROM entity_records WHERE id = ?').get(id) as {
    data_json: string;
  };
  return JSON.parse(row.data_json) as Record<string, unknown>;
}

function accountRows(db: Database.Database): Array<Record<string, unknown>> {
  const def = db
    .prepare('SELECT id FROM entity_definitions WHERE entity_key = ?')
    .get('accounts') as { id: number };
  const rows = db
    .prepare('SELECT data_json FROM entity_records WHERE entity_definition_id = ? ORDER BY id')
    .all(def.id) as Array<{ data_json: string }>;
  return rows.map((row) => JSON.parse(row.data_json) as Record<string, unknown>);
}

describe('listContactCompanyNames', () => {
  test('returns distinct trimmed names in first-seen order', () => {
    const db = new Database(':memory:');
    createSchema(db);
    insertContact(db, { firstName: 'Avery', company: 'Northwind Labs' });
    insertContact(db, { firstName: 'Jordan', company: 'Summit Health' });
    insertContact(db, { firstName: 'Sam', company: 'Northwind Labs ' });
    insertContact(db, { firstName: 'NoCompany' });
    insertContact(db, { firstName: 'Blank', company: '   ' });

    expect(listContactCompanyNames(db)).toEqual(['Northwind Labs', 'Summit Health']);
    db.close();
  });

  test('returns empty when there is no contacts entity', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE entity_definitions (id INTEGER PRIMARY KEY, entity_key TEXT, name TEXT);
      CREATE TABLE entity_records (id INTEGER PRIMARY KEY, entity_definition_id INTEGER, data_json TEXT);
    `);
    expect(listContactCompanyNames(db)).toEqual([]);
    db.close();
  });
});

describe('backfillAccountsFromContactCompanies', () => {
  test('creates one account per distinct company and links contacts', () => {
    const db = new Database(':memory:');
    createSchema(db);
    const a = insertContact(db, { firstName: 'Avery', company: 'Northwind Labs' });
    const b = insertContact(db, { firstName: 'Jordan', company: 'Summit Health' });
    const c = insertContact(db, { firstName: 'Sam', company: 'Northwind Labs' });

    const result = backfillAccountsFromContactCompanies(db);

    expect(result).toEqual({ accountsCreated: 2, contactsLinked: 3 });
    expect(accountRows(db).map((row) => row.name)).toEqual(['Northwind Labs', 'Summit Health']);

    // Two contacts share an account; the third gets its own.
    expect(readRecord(db, a).companyId).toBeDefined();
    expect(readRecord(db, c).companyId).toBe(readRecord(db, a).companyId);
    expect(readRecord(db, b).companyId).not.toBe(readRecord(db, a).companyId);
    db.close();
  });

  test('is idempotent — a second run creates and links nothing', () => {
    const db = new Database(':memory:');
    createSchema(db);
    insertContact(db, { firstName: 'Avery', company: 'Northwind Labs' });

    const first = backfillAccountsFromContactCompanies(db);
    const second = backfillAccountsFromContactCompanies(db);

    expect(first).toEqual({ accountsCreated: 1, contactsLinked: 1 });
    expect(second).toEqual({ accountsCreated: 0, contactsLinked: 0 });
    expect(accountRows(db)).toHaveLength(1);
    db.close();
  });

  test('leaves contacts without a company unlinked', () => {
    const db = new Database(':memory:');
    createSchema(db);
    const id = insertContact(db, { firstName: 'Solo' });

    const result = backfillAccountsFromContactCompanies(db);

    expect(result).toEqual({ accountsCreated: 0, contactsLinked: 0 });
    expect(readRecord(db, id).companyId).toBeUndefined();
    db.close();
  });

  test('does not overwrite an existing companyId', () => {
    const db = new Database(':memory:');
    createSchema(db);
    const id = insertContact(db, { firstName: 'Avery', company: 'Northwind Labs', companyId: 99 });

    backfillAccountsFromContactCompanies(db);

    expect(readRecord(db, id).companyId).toBe(99);
    db.close();
  });

  test('returns zeros when the accounts entity is missing', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE entity_definitions (id INTEGER PRIMARY KEY, entity_key TEXT, name TEXT);
      CREATE TABLE entity_records (id INTEGER PRIMARY KEY, entity_definition_id INTEGER, data_json TEXT);
    `);
    db.prepare('INSERT INTO entity_definitions (entity_key, name) VALUES (?, ?)').run(
      'contacts',
      'Contacts',
    );
    expect(backfillAccountsFromContactCompanies(db)).toEqual({
      accountsCreated: 0,
      contactsLinked: 0,
    });
    db.close();
  });
});
