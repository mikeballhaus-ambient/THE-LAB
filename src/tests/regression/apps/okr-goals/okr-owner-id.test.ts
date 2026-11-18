import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { bootstrapOkrTables, OkrRepository } from '@/apps/okr-goals/back-end/okr-repository';
import { migratePersonColumnToUserId } from '@/shared/server/person-column-migration';

function setup(): { db: Database.Database; repo: OkrRepository } {
  const db = new Database(':memory:');
  bootstrapOkrTables(db);
  migratePersonColumnToUserId(
    db,
    { table: 'okr_objectives', textColumn: 'owner_name', userColumn: 'owner_id' },
    [],
  );
  return { db, repo: new OkrRepository(db) };
}

describe('OKR objective owner persistence', () => {
  test('writes owner_id when supplied', () => {
    const { db, repo } = setup();

    const created = repo.createObjective({
      title: 'Grow revenue',
      ownerName: 'Mia Chen',
      ownerId: 2,
      quarter: 'Q4',
    });

    expect(created.ownerId).toBe(2);
    const row = db
      .prepare('SELECT owner_id, owner_name FROM okr_objectives WHERE id = ?')
      .get(created.id) as { owner_id: number; owner_name: string };
    expect(row.owner_id).toBe(2);
    expect(row.owner_name).toBe('Mia Chen');
    db.close();
  });

  test('writes null owner_id for a name-only payload (legacy inline UI)', () => {
    const { repo } = setup();

    const created = repo.createObjective({
      title: 'Legacy',
      ownerName: 'Jordan Lee',
      quarter: 'Q4',
    });

    expect(created.ownerId).toBeNull();
    expect(created.ownerName).toBe('Jordan Lee');
  });

  test('updates owner_id on edit', () => {
    const { repo } = setup();
    const created = repo.createObjective({
      title: 'Edit me',
      ownerName: 'Mia Chen',
      ownerId: 2,
      quarter: 'Q1',
    });

    const updated = repo.updateObjective(created.id, {
      title: 'Edit me',
      ownerName: 'Jordan Lee',
      ownerId: 3,
      quarter: 'Q2',
    });

    expect(updated?.ownerId).toBe(3);
    expect(updated?.ownerName).toBe('Jordan Lee');
  });

  test('clearing the owner nulls owner_id', () => {
    const { repo } = setup();
    const created = repo.createObjective({
      title: 'Clear me',
      ownerName: 'Mia Chen',
      ownerId: 2,
      quarter: 'Q1',
    });

    const updated = repo.updateObjective(created.id, {
      title: 'Clear me',
      ownerName: '',
      quarter: 'Q1',
    });

    expect(updated?.ownerId).toBeNull();
    expect(updated?.ownerName).toBe('');
  });

  test('listObjectives exposes ownerId', () => {
    const { repo } = setup();
    repo.createObjective({ title: 'A', ownerName: 'Mia Chen', ownerId: 2, quarter: 'Q1' });

    const [objective] = repo.listObjectives();
    expect(objective.ownerId).toBe(2);
  });
});
