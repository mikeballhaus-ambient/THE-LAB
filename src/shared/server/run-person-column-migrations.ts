import type { Database } from 'better-sqlite3';
import {
  fetchPlatformUsersList,
  resolvePlatformActorUserId,
} from '@/shared/services/platform-user-client.node';
import {
  migratePersonColumnsToUserId,
  type PersonColumnMigration,
  type UserNameLookupRow,
} from '@/shared/server/person-column-migration';

/**
 * Run person-column migrations inside a catalog app server.
 *
 * Catalog apps have no `users` table — identity lives on the platform. This fetches the
 * active user list over the service-token client, then delegates to the shared migration.
 *
 * Swallows failures: a missing platform connection must not stop the app from booting.
 * Un-migrated columns simply keep serving the text mirror.
 */
export async function runPersonColumnMigrations(
  db: Database,
  appLabel: string,
  migrations: PersonColumnMigration[],
): Promise<void> {
  if (migrations.length === 0) {
    return;
  }

  let users: UserNameLookupRow[];
  try {
    const actorUserId = resolvePlatformActorUserId();
    const result = await fetchPlatformUsersList({ actorUserId, limit: 200 });
    users = result.users.map((user) => ({
      id: Number(user.id),
      name: user.name,
      email: user.email,
    }));
  } catch (err) {
    console.warn(
      `[${appLabel}] person-column migration skipped — platform users unavailable:`,
      err instanceof Error ? err.message : err,
    );
    return;
  }

  try {
    const result = migratePersonColumnsToUserId(db, migrations, users);
    if (result.columnsAdded.length > 0 || result.rowsBackfilled > 0) {
      console.log(
        `[${appLabel}] person columns — added=${result.columnsAdded.length} backfilled=${result.rowsBackfilled}`,
      );
    }
  } catch (err) {
    console.warn(
      `[${appLabel}] person-column migration failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}
