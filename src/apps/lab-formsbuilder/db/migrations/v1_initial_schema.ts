/**
 * Migration v1: Initial Forms Builder schema
 * Creates core tables for forms, data connectors, and form submissions.
 *
 * Type Mappings (aligned with shared/types):
 * - forms table uses FormListItem types from shared/types/form-types.ts
 *   - formKey: string (primary key)
 *   - name: string (from FormListItem.name)
 *   - description?: string (from FormListItem.description)
 *   - components_json: string (JSON of CanvasFormSchema.components)
 *   - validation_rules: ValidationRules (from shared/types/form-types.ts)
 *
 * - data_connectors table uses DataConnector types from shared/types/connector-types.ts
 *   - app_name: string (camelCase for API compatibility)
 *   - entity_name: string (camelCase for API compatibility)
 *   - discovery_url: string (camelCase for API compatibility)
 *   - discovery_type: 'GET' | 'POST' (camelCase for API compatibility)
 *   - is_active: number (0/1 integer for database)
 *
 * - form_submissions table stores FormSubmission data
 */

import { Database } from 'better-sqlite3';

export const migrationName = 'v1_initial_schema';

export async function applyMigration(db: Database): Promise<void> {
  // Create data_connectors table first (forms depends on it)
  // Maps to shared/types/connector-types.ts:DataConnector (snake_case variant for database)
  // Note: Database uses snake_case (app_name, entity_name) while API responses use camelCase (appName, entityName)
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_connectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        discovery_url TEXT NOT NULL,
        discovery_type TEXT DEFAULT 'GET',
        entity_model TEXT,
        endpoints TEXT,
        capabilities TEXT,
        is_active INTEGER DEFAULT 1,
        last_verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for data_connectors table
  db.exec(`CREATE INDEX IF NOT EXISTS idx_connectors_app_name ON data_connectors(app_name);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_connectors_entity_name ON data_connectors(entity_name);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_connectors_is_active ON data_connectors(is_active);`);

  // Create forms table with proper foreign key column name
  // Maps to shared/types/form-types.ts:FormListItem & { components_json: string; validation_rules: ValidationRules }
  db.exec(`
    CREATE TABLE IF NOT EXISTS forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        data_connector_id INTEGER REFERENCES data_connectors(id),
        schema_json TEXT NOT NULL,
        components_json TEXT NOT NULL,
        validation_json TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for forms table
  db.exec(`CREATE INDEX IF NOT EXISTS idx_forms_form_key ON forms(form_key);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_forms_data_connector_id ON forms(data_connector_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);`);

  // Create indexes for data_connectors table
  db.exec('CREATE INDEX IF NOT EXISTS idx_connectors_app_name ON data_connectors(app_name);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_connectors_entity_name ON data_connectors(entity_name);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_connectors_is_active ON data_connectors(is_active);');

  // Create form_submissions table with proper foreign key references
  // Maps to shared/types/form-types.ts:FormSubmission
  db.exec(`
    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_key TEXT NOT NULL REFERENCES forms(form_key),  -- FK to forms table
      data_connector_id INTEGER NOT NULL REFERENCES data_connectors(id),  -- FK to data_connectors table
      data TEXT NOT NULL,               -- Submission data as JSON
      status TEXT DEFAULT 'pending',         -- Submission status: 'pending' | 'success' | 'error'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for form_submissions table
  db.exec(`CREATE INDEX IF NOT EXISTS idx_submissions_form_key ON form_submissions(form_key);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_submissions_data_connector_id ON form_submissions(data_connector_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON form_submissions(status);`);

  // Create migration tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS forms_builder_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,   -- e.g., 'v1_initial_schema'
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT                        -- Migration description
    );
  `);

  // Record this migration as applied
  db.prepare(
    `INSERT OR IGNORE INTO forms_builder_migrations (migration_name, description) VALUES (?, ?)`
  ).run(migrationName, 'Initial Forms Builder schema with forms, data_connectors, and form_submissions tables');
}
