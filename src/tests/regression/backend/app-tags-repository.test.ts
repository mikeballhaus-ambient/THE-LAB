import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { appTagsRepository } from '@/backend/db/AppTags/app-tags-repository';
import { appsRepository } from '@/backend/db/Apps/apps-repository';

describe('AppTagsRepository', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = new betterSqlite3(':memory:');

    // Create all tables first
    const { createAppsTable, createIndexes } = await import('@/backend/db/Apps/apps-schema');
    const { bootstrapAppTagsSchema } = await import('@/backend/db/AppTags/app-tags-schema');
    db.exec(createAppsTable);
    db.exec(createIndexes as string);
    bootstrapAppTagsSchema(db);

    // Seed apps first (before tag assignments)
    const seedAppsSQL = `INSERT OR IGNORE INTO apps (id, name, description, fa_icon, order_num, type, component_path, server_config, metadata, app_system_instructions, is_enabled, is_server_side_enabled, dependencies, optional_dependencies, requires_port, version, changelog, latest_version, is_update_available, is_system)
      VALUES
        ('app-ai-tunes', 'AI Tunes', 'An MP3 music player app with WebSocket streaming and metadata extraction from music files', 'fa-music', 6, 'hybrid', '/src/apps/ai-tunes/front-end/App.vue', '{"entry": "/src/apps/ai-tunes/back-end/entry.ts", "port": 3002, "env": {}}', '{"category": "ai-tunes", "author": "developer", "version": "1.0.0", "tags": ["music", "mp3", "player", "streaming"]}', 'AI Tunes - MP3 player with streaming', 1, 1, '[]', '[]', 3002, '1.0.0', '[]', null, 0, 0),
        ('app-dnd-examples', 'Drag & Drop Examples', 'A collection of drag and drop component examples using @vue-dnd-kit/core', 'fa-hand-pointer', 8, 'browser', '/src/apps/dnd-examples/front-end/DragDropExamples.vue', '{"category": "dnd-examples", "author": "developer", "version": "1.0.0", "tags": ["dnd", "examples", "draggable", "dropzone"]}', '{"category": "dnd-examples", "author": "developer", "version": "1.0.0", "tags": ["dnd", "examples", "draggable", "dropzone"]}', 'Drag & Drop Examples', 1, 0, '[]', '[]', null, '1.0.0', '[]', null, 0, 0),
        ('app-example-server', 'Example Server App', 'A hybrid app with Fastify backend server and Vue frontend component with mock data endpoints', 'fa-server', 10, 'hybrid', '/src/apps/example-server/front-end/App.vue', '{"entry": "/src/apps/example-server/back-end/entry.ts", "port": 3001, "env": {}}', '{"category": "example-server", "author": "developer", "version": "1.0.0", "tags": ["example", "hybrid", "server", "fastify"]}', 'Example Server App', 1, 1, '[]', '[]', 3001, '1.0.0', '[]', null, 0, 0),
        ('app-ui-component-gallery', 'UI Component Gallery', 'A gallery showcasing PrimeVue component examples including buttons, inputs, data tables, modals, and more', 'fa-th-large', 9, 'browser', '/src/apps/ui-component-gallery/front-end/UIComponentGallery.vue', '{"category": "ui-component-gallery", "author": "developer", "version": "1.0.0", "tags": ["ui", "components", "primevue", "gallery"]}', '{"category": "ui-component-gallery", "author": "developer", "version": "1.0.0", "tags": ["ui", "components", "primevue", "gallery"]}', 'UI Component Gallery', 1, 0, '[]', '[]', null, '1.0.0', '[]', null, 0, 0),
        ('app-lab-tasklist', 'Task List', 'Keep yourself organized with the AI managed Task List!', 'fa-list-check', 3, 'hybrid', '/src/apps/lab-tasklist/front-end/App.vue', '{"entry":"/src/apps/lab-tasklist/back-end/entry.ts","port":3005,"env":{"NODE_ENV":"development"}}', '{"author":"developer","version":"1.0.0","tags":["task list"],"category":"Custom"}', 'Task List - AI managed tasks', 1, 1, '["app-lab-formsbuilder","app-lab-chartbuilder"]', '[]', 3005, '1.0.0', '[]', '1.0.0', 0, 1),
        ('app-lab-formsbuilder', 'Forms Builder', 'A hybrid app for creating and managing dynamic forms with drag-and-drop design canvas', 'fa-pen-fancy', 5, 'hybrid', '/src/apps/lab-formsbuilder/front-end/App.vue', '{"entry": "/src/apps/lab-formsbuilder/back-end/entry.ts", "port": 3011, "env": {}}', '{"category": "forms-builder", "author": "developer", "version": "1.0.0", "tags": ["forms", "builder", "crm"]}', 'Forms Builder - Dynamic forms', 1, 1, '[]', '[]', 3011, '1.0.0', '[]', null, 0, 1),
        ('app-lab-crm', 'CRM', 'Customer relationship management with dynamic entities and Forms Builder integration', 'fa-building', 1, 'hybrid', '/src/apps/lab-crm/front-end/App.vue', '{"entry":"/src/apps/lab-crm/back-end/entry.ts","port":3010,"env":{"NODE_ENV":"development"}}', '{"author":"developer","version":"1.0.0","tags":["crm"],"category":"Custom"}', 'CRM - Customer management', 1, 1, '["app-lab-formsbuilder","app-lab-chartbuilder","app-lab-tasklist","app-lab-helpdesk"]', '[]', 3010, '1.0.0', '[]', '1.0.0', 0, 1),
        ('app-lab-helpdesk', 'Help Desk', 'Support tickets with CRM record linkage via metadata', 'fa-life-ring', 2, 'hybrid', '/src/apps/lab-helpdesk/front-end/App.vue', '{"entry": "/src/apps/lab-helpdesk/back-end/entry.ts", "port": 3012, "env": {}}', '{"author": "developer", "version": "1.0.0", "tags": ["help-desk"], "category": "Custom"}', 'Help Desk - Support tickets', 1, 1, '["app-lab-formsbuilder","app-lab-chartbuilder"]', '[]', 3012, '1.0.0', '[]', '1.0.0', 0, 1),
        ('app-lab-chartbuilder', 'Chart Builder', 'Design reusable charts; host apps supply data at render time', 'fa-chart-pie', 4, 'hybrid', '/src/apps/lab-chartbuilder/front-end/App.vue', '{"entry": "/src/apps/lab-chartbuilder/back-end/entry.ts", "port": 3013, "env": {}}', '{"author": "developer", "version": "1.0.0", "tags": ["charts", "analytics"], "category": "Custom"}', 'Chart Builder - Reusable charts', 1, 1, '[]', '[]', 3013, '1.0.0', '[]', '1.0.0', 0, 1),
        ('app-word-tile', 'Word Tile', 'Turn-based word game vs AI or friends', 'fa-font', 8, 'hybrid', '/src/apps/word-tile/front-end/App.vue', '{"entry": "/src/apps/word-tile/back-end/entry.ts", "port": 4102, "env": {}}', '{"author": "developer", "version": "1.0.0", "tags": ["games", "word"], "category": "Custom"}', 'Word Tile', 1, 1, '[]', '[]', 4102, '1.0.0', '[]', '1.0.0', 0, 0);
    `;
    db.exec(seedAppsSQL);

    // Initialize repositories - this will seed tags and run backfill for app assignments
    await appTagsRepository.bootstrap(db);
    await appsRepository.bootstrap(db);
    await appTagsRepository.initialize();
    await appsRepository.initialize();
  });

  afterAll(() => {
    appTagsRepository.close();
    appsRepository.close();
    db.close();
  });

  test('deleteTag blocks when apps reference tag', () => {
    const usage = appTagsRepository.listAppsUsingTag('platform');
    expect(usage.length).toBeGreaterThan(0);
    const result = appTagsRepository.deleteTag('platform');
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.apps.length).toBeGreaterThan(0);
    }
  });

  test('setAssignmentsForApp requires at least one tag', () => {
    expect(() => appTagsRepository.setAssignmentsForApp('app-lab-crm', [])).toThrow();
  });

  test('ensurePlatformTagCatalog adds new catalog tags on existing databases', () => {
    expect(appTagsRepository.getTagById('learning')).toBeDefined();
    expect(appTagsRepository.getTagById('creative')).toBeDefined();
  });
});
