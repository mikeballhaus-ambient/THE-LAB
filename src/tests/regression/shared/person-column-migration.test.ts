import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  buildUserNameLookup,
  migratePersonColumnsToUserId,
  migratePersonColumnToUserId,
} from '@/shared/server/person-column-migration';

const USERS = [
  { id: 2, name: 'Mia Chen', email: 'mia.chen@lab.local' },
  { id: 3, name: 'Jordan Lee', email: 'jordan.lee@lab.local' },
];

function createObjectiveTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE okr_objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      owner_name TEXT NOT NULL DEFAULT ''
    );
  `);
}

describe('buildUserNameLookup', () => {
  test('maps lowercased name and email to ids', () => {
    const lookup = buildUserNameLookup(USERS);
    expect(lookup.get('mia chen')).toBe(2);
    expect(lookup.get('mia.chen@lab.local')).toBe(2);
    expect(lookup.get('jordan lee')).toBe(3);
  });

  test('skips blank names and emails', () => {
    const lookup = buildUserNameLookup([{ id: 9, name: '  ', email: '' }]);
    expect(lookup.size).toBe(0);
  });
});

describe('migratePersonColumnToUserId', () => {
  test('adds the column and backfills matching names', () => {
    const db = new Database(':memory:');
    createObjectiveTable(db);
    db.prepare('INSERT INTO okr_objectives (title, owner_name) VALUES (?, ?)').run(
      'Grow revenue',
      'Mia Chen',
    );
    db.prepare('INSERT INTO okr_objectives (title, owner_name) VALUES (?, ?)').run(
      'Reduce churn',
      'Jordan Lee',
    );

    const result = migratePersonColumnToUserId(
      db,
      { table: 'okr_objectives', textColumn: 'owner_name', userColumn: 'owner_id' },
      USERS,
    );

    expect(result.columnsAdded).toEqual(['okr_objectives.owner_id']);
    expect(result.rowsBackfilled).toBe(2);

    const rows = db
      .prepare('SELECT owner_id, owner_name FROM okr_objectives ORDER BY id')
      .all() as Array<{ owner_id: number; owner_name: string }>;
    expect(rows.map((row) => row.owner_id)).toEqual([2, 3]);
    // Text mirror preserved.
    expect(rows[0].owner_name).toBe('Mia Chen');
    db.close();
  });

  test('leaves unresolvable names null instead of guessing', () => {
    const db = new Database(':memory:');
    createObjectiveTable(db);
    db.prepare('INSERT INTO okr_objectives (title, owner_name) VALUES (?, ?)').run(
      'Unknown owner',
      'Nobody Here',
    );

    const result = migratePersonColumnToUserId(
      db,
      { table: 'okr_objectives', textColumn: 'owner_name', userColumn: 'owner_id' },
      USERS,
    );

    expect(result.rowsBackfilled).toBe(0);
    const row = db.prepare('SELECT owner_id FROM okr_objectives').get() as { owner_id: number | null };
    expect(row.owner_id).toBeNull();
    db.close();
  });

  test('matches case-insensitively and trims', () => {
    const db = new Database(':memory:');
    createObjectiveTable(db);
    db.prepare('INSERT INTO okr_objectives (title, owner_name) VALUES (?, ?)').run(
      'Case test',
      '  mia chen  ',
    );

    migratePersonColumnToUserId(
      db,
      { table: 'okr_objectives', textColumn: 'owner_name', userColumn: 'owner_id' },
      USERS,
    );

    const row = db.prepare('SELECT owner_id FROM okr_objectives').get() as { owner_id: number };
    expect(row.owner_id).toBe(2);
    db.close();
  });

  test('is idempotent — does not re-add the column or re-backfill', () => {
    const db = new Database(':memory:');
    createObjectiveTable(db);
    db.prepare('INSERT INTO okr_objectives (title, owner_name) VALUES (?, ?)').run(
      'Once',
      'Mia Chen',
    );

    const migration = {
      table: 'okr_objectives',
      textColumn: 'owner_name',
      userColumn: 'owner_id',
    };
    const first = migratePersonColumnToUserId(db, migration, USERS);
    const second = migratePersonColumnToUserId(db, migration, USERS);

    expect(first.columnsAdded).toHaveLength(1);
    expect(first.rowsBackfilled).toBe(1);
    expect(second.columnsAdded).toHaveLength(0);
    expect(second.rowsBackfilled).toBe(0);
    db.close();
  });

  test('skips a missing table without throwing', () => {
    const db = new Database(':memory:');
    const result = migratePersonColumnToUserId(
      db,
      { table: 'nope', textColumn: 'a', userColumn: 'b' },
      USERS,
    );
    expect(result).toEqual({ columnsAdded: [], rowsBackfilled: 0 });
    db.close();
  });
});

describe('migratePersonColumnsToUserId', () => {
  test('applies multiple migrations and aggregates counts', () => {
    const db = new Database(':memory:');
    createObjectiveTable(db);
    db.exec(`
      CREATE TABLE suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT ''
      );
    `);
    db.prepare('INSERT INTO okr_objectives (title, owner_name) VALUES (?, ?)').run('A', 'Mia Chen');
    db.prepare('INSERT INTO suggestions (title, author) VALUES (?, ?)').run('B', 'Jordan Lee');

    const result = migratePersonColumnsToUserId(
      db,
      [
        { table: 'okr_objectives', textColumn: 'owner_name', userColumn: 'owner_id' },
        { table: 'suggestions', textColumn: 'author', userColumn: 'author_id' },
      ],
      USERS,
    );

    expect(result.columnsAdded).toEqual([
      'okr_objectives.owner_id',
      'suggestions.author_id',
    ]);
    expect(result.rowsBackfilled).toBe(2);
    db.close();
  });
});
