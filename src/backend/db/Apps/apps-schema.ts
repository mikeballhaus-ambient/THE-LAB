

import type { Database, Statement } from 'better-sqlite3';

import { aiTunesInstructions } from './app-instructions/ai-tunes-app-instructions';

import { dndExamplesInstructions } from './app-instructions/dnd-examples-app-instructions';

import { exampleServerInstructions } from './app-instructions/example-server-app-instructions';

import { uiComponentGalleryInstructions } from './app-instructions/ui-component-gallery-app-instructions';

import { taskListInstructions } from './app-instructions/task-list-app-instructions';

import { formsBuilderInstructions } from './app-instructions/forms-builder-app-instructions';

import { crmAppInstructions } from './app-instructions/crm-app-instructions';

import { helpDeskAppInstructions } from './app-instructions/help-desk-app-instructions';

import { labAppBuilderCatalogAppInstructions } from './app-instructions/lab-app-builder-app-instructions';
import { labApprovalsPoliciesAppInstructions } from './app-instructions/lab-approvals-policies-app-instructions';
import { labFinancialLedgerAppInstructions } from './app-instructions/lab-financial-ledger-app-instructions';
import { labWorkflowStudioAppInstructions } from './app-instructions/lab-workflow-studio-app-instructions';



/** Escape app instruction markdown for embedding in seed SQL string literals */

function sqlEscapeInstructions(text: string): string {

  return text.replace(/'/g, "''");

}



export const createAppsTable = `

  CREATE TABLE IF NOT EXISTS apps (

    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    description TEXT NOT NULL,

    fa_icon TEXT NOT NULL,

    order_num INTEGER NOT NULL DEFAULT 0,

    type TEXT NOT NULL CHECK(type IN ('browser', 'server', 'hybrid')),

    component_path TEXT,

    server_config TEXT NOT NULL,

    metadata TEXT NOT NULL,

    app_system_instructions TEXT,

    is_enabled INTEGER NOT NULL DEFAULT 1,

    is_server_side_enabled INTEGER NOT NULL DEFAULT 0,

    dependencies TEXT NOT NULL,

    optional_dependencies TEXT NOT NULL,

    requires_port INTEGER,

    version TEXT NOT NULL DEFAULT '1.0.0',

    changelog TEXT NOT NULL,

    latest_version TEXT,

    is_update_available INTEGER NOT NULL DEFAULT 0,

    is_system INTEGER NOT NULL DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

  );

`;



export const createIndexes = `

  CREATE INDEX IF NOT EXISTS idx_apps_order ON apps(order_num);

  CREATE INDEX IF NOT EXISTS idx_apps_enabled ON apps(is_enabled);

`;



/** App folder name (AppDatabaseService id) → DDL statements run at app DB bootstrap */

export const appEntityTableDDLByAppFolder: Record<string, string[]> = {};



export function ensureAppEntityTables(db: Database, appFolderName: string): void {

  const statements = appEntityTableDDLByAppFolder[appFolderName] ?? [];

  for (const sql of statements) {

    db.exec(sql);

  }

}



export const seedApps = `

  INSERT OR IGNORE INTO apps (id, name, description, fa_icon, order_num, type, component_path, server_config, metadata, app_system_instructions, is_enabled, is_server_side_enabled, dependencies, optional_dependencies, requires_port, version, changelog, latest_version, is_update_available, is_system)

  VALUES

    ('app-ai-tunes', 'AI Tunes', 'An MP3 music player app with WebSocket streaming and metadata extraction from music files', 'fa-music', 5, 'hybrid', '/src/apps/ai-tunes/front-end/App.vue', '{"entry": "/src/apps/ai-tunes/back-end/entry.ts", "port": 3002, "env": {}}', '{"category": "ai-tunes", "author": "developer", "version": "1.0.0", "tags": ["music", "mp3", "player", "streaming"]}', '${sqlEscapeInstructions(aiTunesInstructions)}', 1, 1, '[]', '[]', 3002, '1.0.0', '[{"version": "1.0.0", "date": "2026-05-19", "notes": "Initial release with AI Tunes MP3 player"}]', null, 0, 0),

    ('app-dnd-examples', 'Drag & Drop Examples', 'A collection of drag and drop component examples using @vue-dnd-kit/core', 'fa-hand-pointer', 6, 'browser', '/src/apps/dnd-examples/front-end/DragDropExamples.vue', '{"category": "dnd-examples", "author": "developer", "version": "1.0.0", "tags": ["dnd", "examples", "draggable", "dropzone"]}', '{"category": "dnd-examples", "author": "developer", "version": "1.0.0", "tags": ["dnd", "examples", "draggable", "dropzone"]}', '${sqlEscapeInstructions(dndExamplesInstructions)}', 1, 0, '[]', '[]', null, '1.0.0', '[{"version": "1.0.0", "date": "2026-05-18", "notes": "Initial release with 22 drag-and-drop examples"}]', null, 0, 0),

    ('app-example-server', 'Example Server App', 'A hybrid app with Fastify backend server and Vue frontend component with mock data endpoints', 'fa-server', 8, 'hybrid', '/src/apps/example-server/front-end/App.vue', '{"entry": "/src/apps/example-server/back-end/entry.ts", "port": 3001, "env": {}}', '{"category": "example-server", "author": "developer", "version": "1.0.0", "tags": ["example", "hybrid", "server", "fastify"]}', '${sqlEscapeInstructions(exampleServerInstructions)}', 1, 1, '[]', '[]', 3001, '1.0.0', '[{"version": "1.0.0", "date": "2026-05-18", "notes": "Initial release with health and data endpoints"}]', null, 0, 0),

    ('app-ui-component-gallery', 'UI Component Gallery', 'A gallery showcasing PrimeVue component examples including buttons, inputs, data tables, modals, and more', 'fa-th-large', 7, 'browser', '/src/apps/ui-component-gallery/front-end/UIComponentGallery.vue', '{"category": "ui-component-gallery", "author": "developer", "version": "1.0.0", "tags": ["ui", "components", "primevue", "gallery"]}', '{"category": "ui-component-gallery", "author": "developer", "version": "1.0.0", "tags": ["ui", "components", "primevue", "gallery"]}', '${sqlEscapeInstructions(uiComponentGalleryInstructions)}', 1, 0, '[]', '[]', null, '1.0.0', '[{"version": "1.0.0", "date": "2026-05-18", "notes": "Initial release with 14 PrimeVue component examples"}]', null, 0, 0),

    ('app-lab-tasklist', 'Task List', 'Keep yourself organized with the AI managed Task List!', 'fa-list-check', 3, 'hybrid', '/src/apps/lab-tasklist/front-end/App.vue', '{"entry":"/src/apps/lab-tasklist/back-end/entry.ts","port":3005,"env":{"NODE_ENV":"development"}}', '{"author":"developer","version":"1.0.0","tags":["task list"],"category":"Custom"}', '${sqlEscapeInstructions(taskListInstructions)}', 1, 1, '["app-lab-formsbuilder"]', '[]', 3005, '1.0.0', '[]', '1.0.0', 0, 1),

    ('app-lab-formsbuilder', 'Forms Builder', 'A hybrid app for creating and managing dynamic forms with drag-and-drop design canvas', 'fa-pen-fancy', 4, 'hybrid', '/src/apps/lab-formsbuilder/front-end/App.vue', '{"entry": "/src/apps/lab-formsbuilder/back-end/entry.ts", "port": 3011, "env": {}}', '{"category": "forms-builder", "author": "developer", "version": "1.0.0", "tags": ["forms", "builder", "crm"]}', '${sqlEscapeInstructions(formsBuilderInstructions)}', 1, 1, '[]', '[]', 3011, '1.0.0', '[]', null, 0, 1),

    ('app-lab-crm', 'CRM', 'Customer relationship management with dynamic entities and Forms Builder integration', 'fa-building', 1, 'hybrid', '/src/apps/lab-crm/front-end/App.vue', '{"entry":"/src/apps/lab-crm/back-end/entry.ts","port":3010,"env":{"NODE_ENV":"development"}}', '{"author":"developer","version":"1.0.0","tags":["crm"],"category":"Custom"}', '${sqlEscapeInstructions(crmAppInstructions)}', 1, 1, '["app-lab-formsbuilder","app-lab-tasklist","app-lab-helpdesk"]', '[]', 3010, '1.0.0', '[]', '1.0.0', 0, 1),

    ('app-lab-helpdesk', 'Help Desk', 'Support tickets with CRM record linkage via metadata', 'fa-life-ring', 2, 'hybrid', '/src/apps/lab-helpdesk/front-end/App.vue', '{"entry":"/src/apps/lab-helpdesk/back-end/entry.ts","port":3012,"env":{"NODE_ENV":"development"}}', '{"author":"developer","version":"1.0.0","tags":["help-desk"],"category":"Custom"}', '${sqlEscapeInstructions(helpDeskAppInstructions)}', 1, 1, '["app-lab-formsbuilder","app-lab-chartbuilder"]', '[]', 3012, '1.0.0', '[]', '1.0.0', 0, 1),

    ('app-lab-workflow-studio', 'Workflow Studio', 'Design and manage lab automation workflows on the domain event bus', 'fa-diagram-project', 6, 'browser', '/src/apps/lab-workflow-studio/front-end/App.vue', '{}', '{"author":"developer","version":"1.0.0","tags":["platform","automation"],"category":"Platform"}', '${sqlEscapeInstructions(labWorkflowStudioAppInstructions)}', 1, 0, '[]', '[]', null, '1.0.0', '[]', '1.0.0', 0, 1),

    ('app-lab-approvals-policies', 'Approvals & Policies', 'Approval inbox and configurable approval policies', 'fa-clipboard-check', 7, 'browser', '/src/apps/lab-approvals-policies/front-end/App.vue', '{}', '{"author":"developer","version":"1.0.0","tags":["platform","approvals"],"category":"Platform"}', '${sqlEscapeInstructions(labApprovalsPoliciesAppInstructions)}', 1, 0, '["app-lab-formsbuilder"]', '[]', null, '1.0.0', '[]', '1.0.0', 0, 1),

    ('app-lab-financial-ledger', 'Financial Ledger', 'Platform journal and chart of accounts', 'fa-book', 8, 'browser', '/src/apps/lab-financial-ledger/front-end/App.vue', '{}', '{"author":"developer","version":"1.0.0","tags":["platform","ledger"],"category":"Platform"}', '${sqlEscapeInstructions(labFinancialLedgerAppInstructions)}', 1, 0, '["app-lab-formsbuilder","app-lab-chartbuilder"]', '[]', null, '1.0.0', '[]', '1.0.0', 0, 1),

    ('app-lab-app-builder', 'App Builder', 'Scaffold new lab apps with Sidecar and App Management tools', 'fa-hammer', 9, 'browser', '/src/apps/lab-app-builder/front-end/App.vue', '{}', '{"author":"developer","version":"1.0.0","tags":["platform","app-builder"],"category":"Platform"}', '${sqlEscapeInstructions(labAppBuilderCatalogAppInstructions)}', 1, 0, '["app-lab-formsbuilder"]', '[]', null, '1.0.0', '[]', '1.0.0', 0, 1)

`;



export const AppsSQLStatementKeys = {

  // Queries

  apps_by_id: 'apps_by_id',

  apps_by_name: 'apps_by_name',

  apps_all: 'apps_all',

  apps_enabled: 'apps_enabled',

  apps_by_type: 'apps_by_type',



  // Statements

  insert_app: 'insert_app',

  update_app: 'update_app',

  delete_app: 'delete_app',

} as const;



export type AppsSQLStatementKey = keyof typeof AppsSQLStatementKeys;



export const createAppsSQLStatements = (
  db: Database,
): Record<AppsSQLStatementKey, Statement> => {

  const q = (sql: string) => db.prepare(sql);



  return {

    // Query statements

    [AppsSQLStatementKeys.apps_by_id]: q(`

      SELECT * FROM apps WHERE id = ?

    `),



    [AppsSQLStatementKeys.apps_by_name]: q(`

      SELECT * FROM apps WHERE name = ?

    `),



    [AppsSQLStatementKeys.apps_all]: q(`

      SELECT * FROM apps ORDER BY order_num ASC

    `),



    [AppsSQLStatementKeys.apps_enabled]: q(`

      SELECT * FROM apps WHERE is_enabled = 1 ORDER BY order_num ASC

    `),



    [AppsSQLStatementKeys.apps_by_type]: q(`

      SELECT * FROM apps WHERE type = ? ORDER BY order_num ASC

    `),



    // CRUD statements

    [AppsSQLStatementKeys.insert_app]: q(`

      INSERT INTO apps (

        id, name, description, fa_icon, order_num, type, component_path,

        server_config, metadata, app_system_instructions, is_enabled, is_server_side_enabled,

        dependencies, optional_dependencies, requires_port,

        version, changelog, latest_version, is_update_available, is_system

      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    `),



    [AppsSQLStatementKeys.update_app]: q(`

      UPDATE apps

      SET name = ?, description = ?, fa_icon = ?, order_num = ?, type = ?,

          component_path = ?, server_config = ?, metadata = ?, app_system_instructions = ?,

          is_enabled = ?, is_server_side_enabled = ?, dependencies = ?, optional_dependencies = ?,

          requires_port = ?, version = ?, changelog = ?, latest_version = ?,

          is_update_available = ?, updated_at = CURRENT_TIMESTAMP

      WHERE id = ?

    `),



    [AppsSQLStatementKeys.delete_app]: q(`

      DELETE FROM apps WHERE id = ?

    `),

  };

};


