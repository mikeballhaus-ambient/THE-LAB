/**
 * Migration runner for Forms Builder per-app database.
 * Manages version tracking and applies migrations in order.
 */

import { Database } from 'better-sqlite3';
import { migrationName as v1MigrationName, applyMigration as v1ApplyMigration } from './v1_initial_schema';

export interface Migration {
  name: string;
  apply: (db: Database) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    name: v1MigrationName,
    apply: v1ApplyMigration,
  },
];

/**
 * Checks if a migration has been applied.
 * @param db - Database connection
 * @param migrationName - Name of the migration to check
 * @returns true if migration has been applied
 */
export async function hasAppliedMigration(db: Database, migrationName: string): Promise<boolean> {
  const result = db
    .prepare('SELECT COUNT(*) > 0 as exists FROM forms_builder_migrations WHERE migration_name = ?')
    .get(migrationName) as { exists: number } | undefined;

  return Boolean(result?.exists);
}

/**
 * Applies all pending migrations.
 * @param db - Database connection
 * @returns Array of applied migration names
 */
export async function applyPendingMigrations(db: Database): Promise<string[]> {
  const appliedMigrations: string[] = [];

  for (const migration of migrations) {
    if (!await hasAppliedMigration(db, migration.name)) {
      try {
        await migration.apply(db);
        appliedMigrations.push(migration.name);
      } catch (error) {
        console.error(`Failed to apply migration ${migration.name}:`, error);
        throw error;
      }
    }
  }

  return appliedMigrations;
}

/**
 * Gets the list of all applied migrations.
 * @param db - Database connection
 * @returns Array of applied migration names
 */
export async function getAppliedMigrations(db: Database): Promise<string[]> {
  const result = db
    .prepare('SELECT migration_name FROM forms_builder_migrations ORDER BY applied_at')
    .all() as Array<{ migration_name: string }>;

  return result.map((row) => row.migration_name);
}
