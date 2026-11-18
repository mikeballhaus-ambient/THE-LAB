import { describe, expect, test } from '@jest/globals';
import { CATALOG_HOST_APP_IDS, catalogHostDef } from '@/shared/lab-integrations/catalog-manifests';
import { CATALOG_PERSON_COLUMNS } from '@/shared/config/catalog-person-columns';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';

/** Maps a manifest lab-user property name to the column it persists to. */
const MANIFEST_PROPERTY_TO_COLUMN: Record<string, string> = {
  ownerName: 'owner',
  sponsor: 'sponsor',
  stakeholders: 'stakeholders_owner',
  author: 'author',
  submitter: 'submitter',
  newHire: 'new_hire',
  owner: 'owner',
  guestName: 'guest_user',
  learner: 'learner',
  voter: 'voter',
  userId: 'user',
  teamMember: 'user',
};

function labUserProps(appId: string): string[] {
  const def = catalogHostDef(appId);
  if (!def) return [];
  return def.entities.flatMap((entity) =>
    (entity.properties as FormBuilderContractModelProperty[])
      .filter((p) => p.lookupProvider === 'lab-user')
      .map((p) => p.name),
  );
}

describe('catalog person columns match manifests', () => {
  test('every manifest lab-user field has a migration column', () => {
    const problems: string[] = [];

    for (const appId of CATALOG_HOST_APP_IDS) {
      const props = labUserProps(appId);
      const migrations = CATALOG_PERSON_COLUMNS[appId] ?? [];
      const migratedColumns = new Set(migrations.map((m) => m.userColumn.replace(/_id$/, '')));

      for (const prop of props) {
        const expectedColumn = MANIFEST_PROPERTY_TO_COLUMN[prop];
        if (!expectedColumn) {
          problems.push(`${appId}.${prop} — no column mapping defined in test`);
          continue;
        }
        if (!migratedColumns.has(expectedColumn)) {
          problems.push(`${appId}.${prop} — manifest declares lab-user but no ${expectedColumn}_id migration`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  test('every entity-backed migration column maps back to a manifest lab-user field', () => {
    const problems: string[] = [];

    for (const [appId, migrations] of Object.entries(CATALOG_PERSON_COLUMNS)) {
      const props = labUserProps(appId).map((p) => MANIFEST_PROPERTY_TO_COLUMN[p]);

      for (const migration of migrations) {
        const col = migration.userColumn.replace(/_id$/, '');
        if (!props.includes(col)) {
          problems.push(`${appId}.${migration.userColumn} — migration exists but manifest has no matching lab-user field`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  test('non-entity person columns are tracked separately, not in the entity map', () => {
    // quiz_attempts / poll_votes have no connector surface; entity-backed certs do.
    expect(CATALOG_PERSON_COLUMNS['app-training-quizzes']).toEqual([
      { table: 'learner_certifications', textColumn: 'learner', userColumn: 'learner_id' },
    ]);
    expect(CATALOG_PERSON_COLUMNS['app-polls-surveys']).toBeUndefined();
  });
});
