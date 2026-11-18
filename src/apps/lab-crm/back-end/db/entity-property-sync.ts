import type { Database } from 'better-sqlite3';
import type { EntityProperty } from '../../shared/types/entity.types';
import { DEFAULT_ENTITY_SEEDS } from './seed-default-entities';
import { demoLabUserIdForIndex } from '@/backend/db/Auth/seed-demo-users';
import { hasDemoDataset } from './seed-demo-records';

export function appendMissingPropertiesFromSeeds(db: Database, entityKeys: string[]): void {
  const select = db.prepare(
    'SELECT properties_json FROM entity_definitions WHERE entity_key = ? LIMIT 1',
  );
  const update = db.prepare(
    'UPDATE entity_definitions SET properties_json = ?, updated_at = datetime(\'now\') WHERE entity_key = ?',
  );

  for (const entityKey of entityKeys) {
    const seed = DEFAULT_ENTITY_SEEDS.find(s => s.entityKey === entityKey);
    if (!seed) {
      continue;
    }
    const row = select.get(entityKey) as { properties_json?: string } | undefined;
    if (!row?.properties_json) {
      continue;
    }
    let props: EntityProperty[] = [];
    try {
      props = JSON.parse(row.properties_json) as EntityProperty[];
    } catch {
      props = [];
    }
    const names = new Set(props.map(p => p.name));
    for (const add of seed.properties) {
      if (!names.has(add.name)) {
        props.push(add);
      }
    }
    update.run(JSON.stringify(props), entityKey);
  }
}

const LAB_USER_FIELD_BY_ENTITY: Record<string, string> = {
  contacts: 'accountOwnerId',
  sales: 'ownerId',
  service: 'assignedTo',
};

/** Set lab user fields on existing demo CRM rows when definitions were upgraded. */
export function backfillDemoLabUserFields(db: Database): void {
  if (!hasDemoDataset(db)) {
    return;
  }

  for (const [entityKey, fieldName] of Object.entries(LAB_USER_FIELD_BY_ENTITY)) {
    const def = db
      .prepare('SELECT id FROM entity_definitions WHERE entity_key = ? LIMIT 1')
      .get(entityKey) as { id: number } | undefined;
    if (!def) {
      continue;
    }
    const rows = db
      .prepare(
        `SELECT id, data_json FROM entity_records WHERE entity_definition_id = ? ORDER BY id ASC`,
      )
      .all(def.id) as { id: number; data_json: string }[];

    const update = db.prepare(
      `UPDATE entity_records SET data_json = ?, updated_at = datetime('now') WHERE id = ?`,
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(row.data_json) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (data[fieldName] != null) {
        continue;
      }
      data[fieldName] = demoLabUserIdForIndex(row.id + i);
      update.run(JSON.stringify(data), row.id);
    }
  }
}
