import { describe, expect, test } from '@jest/globals';
import {
  CATALOG_NON_ENTITY_PERSON_COLUMNS,
  CATALOG_PERSON_COLUMNS,
  catalogPersonColumnsFor,
} from '@/shared/config/catalog-person-columns';
import { CATALOG_HOST_APP_IDS, catalogHostDef } from '@/shared/lab-integrations/catalog-manifests';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';

function labUserFields(appId: string): string[] {
  const def = catalogHostDef(appId);
  if (!def) {
    return [];
  }
  return def.entities.flatMap((entity) =>
    (entity.properties as FormBuilderContractModelProperty[])
      .filter((prop) => prop.lookupProvider === 'lab-user')
      .map((prop) => prop.name),
  );
}

describe('catalog-person-columns', () => {
  test('every app declaring lab-user fields has a migration entry', () => {
    const missing = CATALOG_HOST_APP_IDS.filter(
      (appId) => labUserFields(appId).length > 0 && !CATALOG_PERSON_COLUMNS[appId],
    );
    expect(missing).toEqual([]);
  });

  test('every migration entry belongs to an app that declares lab-user fields', () => {
    const stray = Object.keys(CATALOG_PERSON_COLUMNS).filter(
      (appId) => labUserFields(appId).length === 0,
    );
    expect(stray).toEqual([]);
  });

  test('migration counts do not exceed declared lab-user field counts', () => {
    // Non-entity tables (quiz_attempts, poll_votes) are listed separately — see
    // CATALOG_NON_ENTITY_PERSON_COLUMNS. Here we only check entity-backed migrations.
    for (const appId of Object.keys(CATALOG_PERSON_COLUMNS)) {
      expect({
        appId,
        ok: (CATALOG_PERSON_COLUMNS[appId] ?? []).length <= labUserFields(appId).length,
      }).toEqual({ appId, ok: true });
    }
  });

  test('non-entity migrations are declared for apps with no matching manifest field', () => {
    // These exist because the table has no connector surface, not because of an oversight.
    expect(CATALOG_NON_ENTITY_PERSON_COLUMNS['app-training-quizzes']).toEqual([
      { table: 'quiz_attempts', textColumn: 'learner', userColumn: 'learner_id' },
    ]);
    expect(CATALOG_NON_ENTITY_PERSON_COLUMNS['app-polls-surveys']).toEqual([
      { table: 'poll_votes', textColumn: 'voter', userColumn: 'voter_id' },
    ]);
    // `learner` on certifications is entity-backed; `quiz_attempts.learner` is the non-entity mirror.
    expect(labUserFields('app-training-quizzes')).toContain('learner');
    expect(labUserFields('app-polls-surveys')).not.toContain('voter');
  });

  test('every migration has distinct table/column pairs', () => {
    for (const [appId, migrations] of Object.entries(CATALOG_PERSON_COLUMNS)) {
      const keys = migrations.map((m) => `${m.table}.${m.userColumn}`);
      expect({ appId, duplicates: keys.length !== new Set(keys).size }).toEqual({
        appId,
        duplicates: false,
      });
    }
  });

  test('user columns are integer-id shaped', () => {
    for (const migrations of Object.values(CATALOG_PERSON_COLUMNS)) {
      for (const migration of migrations) {
        expect(migration.userColumn.endsWith('_id')).toBe(true);
        expect(migration.userColumn).not.toBe(migration.textColumn);
      }
    }
  });

  test('catalogPersonColumnsFor returns an empty array for unknown apps', () => {
    expect(catalogPersonColumnsFor('app-not-a-thing')).toEqual([]);
  });

  test('catalogPersonColumnsFor returns the declared migrations', () => {
    expect(catalogPersonColumnsFor('app-okr-goals')).toEqual([
      { table: 'okr_objectives', textColumn: 'owner_name', userColumn: 'owner_id' },
    ]);
  });
});
