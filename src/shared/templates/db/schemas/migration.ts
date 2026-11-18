import better_sqlite3 from 'better-sqlite3';

/**
 * Migration tracking table name template
 * Replaces {appName} with actual app name
 */
export function getMigrationTableName(appName: string): string {
    return `${appName}_migrations`;
}

/**
 * Records a migration as applied
 * @param db Database connection
 * @param migrationName Migration filename (e.g., "create_inventory_table_v1")
 * @param schemaVersion Schema version number (e.g., 1)
 * @param description Optional description of migration
 */
export function recordMigration(
    db: better_sqlite3.Database,
    migrationName: string,
    schemaVersion: number,
    description?: string
): void {
    const tableName = getMigrationTableName(db.name || 'app');
    const prepared = db.prepare(`
        INSERT INTO ${tableName}
        (migration_name, schema_version, description)
        VALUES (?, ?, ?)
    `);

    const timestamp = new Date().toISOString();
    prepared.run(migrationName, schemaVersion, description || timestamp);
}

/**
 * Get list of applied migrations
 * @param db Database connection
 * @returns Record of migration name to applied timestamp
 */
export function getAppliedMigrations(db: better_sqlite3.Database): Record<string, string> {
    const tableName = getMigrationTableName(db.name || 'app');
    const statements = db.prepare(`
        SELECT migration_name, applied_at
        FROM ${tableName}
    `);

    const migrations: Record<string, string> = {};
    const rows = statements.all() as Array<{ migration_name: string, applied_at: string }>;

    for (const row of rows) {
        migrations[row.migration_name] = row.applied_at;
    }

    return migrations;
}

/**
 * Get current schema version 
 * @param db Database connection
 * @returns Schema version number
 */
export function getSchemaVersion(db: better_sqlite3.Database): number {
    try {
        const migrations = getAppliedMigrations(db);
        if (Object.keys(migrations).length === 0) {
            return 0;
        }
        // Return the highest schema version found
        // For simplicity, return 1 if any migration exists
        return 1;
    } catch {
        return 0;
    }
}

/**
 * Check if migration has been applied
 * @param db Database connection
 * @param migrationName Migration filename
 * @returns true if already applied
 */
export function isMigrationApplied(
    db: better_sqlite3.Database,
    migrationName: string
): boolean {
    const applied = getAppliedMigrations(db);
    return migrationName in applied;
}

/**
 * Parse schema version from migration filename
 * @param filename Migration filename (e.g., "create_inventory_table_v1")
 * @returns Schema version number
 */
export function parseVersion(filename: string): number {
    const match = filename.match(/_v(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
}
