import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import schema from shared types
import { 
  createAppSchemaFields,
  getAppSchemaFields,
  getAppsSchemaFields,
  updateAppSchemaFields,
  deleteAppSchemaFields,
  addTableSchemaFields,
  removeTableSchemaFields,
  addColumnSchemaFields,
  removeColumnSchemaFields,
  selectSchemaFields,
  insertSchemaFields,
  updateSchemaFields,
  deleteSchemaFields,
  executeRawSchemaFields,
} from '../../../../shared/types';

// Import handler functions from existing utilities
import { createApp, getApp, getApps, updateApp, deleteApp } from './utils/app-manager-base-handlers';
import { handleAddTable, handleRemoveTable, handleAddColumn, handleRemoveColumn, handleSelect, handleInsert, handleUpdate, handleDelete, handleExecuteRaw } from './utils/app-manager-db-handlers';

// 1. Initialize the native App Management Server
export const appManagementMcpServer = new McpServer({
  name: 'system-app-management-server',
  version: '1.0.0',
});

// ==========================================
// TOOL 1: create_app
// ==========================================
const CREATE_APP_DESC =
  'Creates a new app entry with metadata and scaffolds file structure. Generates app directory, creates isolated SQLite database with standard tables (items, users, configs, logs), and initializes app configuration. REQUIRED for home grid placement: pass catalogTagIds (primary first) or catalogTags on every create — creates missing platform catalog sections and links the app. Without them the app appears only under Other apps. Do not scaffold then assign tags in a separate step.';

appManagementMcpServer.registerTool(
  'app_management_create_app',
  {
    description: CREATE_APP_DESC,
    inputSchema: createAppSchemaFields,
  },
  async (rawArgs) => {
    const params = createAppSchemaFields.parse(rawArgs);
    const result = await createApp(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 2: get_app
// ==========================================
const GET_APP_DESC = 'Retrieves a single app record by its unique ID from the SQLite repository. Returns complete app metadata including server configuration and changelog entries.';

appManagementMcpServer.registerTool(
  'app_management_get_app',
  {
    description: GET_APP_DESC,
    inputSchema: getAppSchemaFields,
  },
  async ({ userId, id }) => {
    const params = { userId, id };
    const result = await getApp(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 3: get_apps
// ==========================================
const GET_APPS_DESC = 'Lists all apps in the repository with optional filtering by type (browser/server/hybrid) and enabled status. Returns array of app objects.';

appManagementMcpServer.registerTool(
  'app_management_get_apps',
  {
    description: GET_APPS_DESC,
    inputSchema: getAppsSchemaFields,
  },
  async ({ userId, type, isEnabled }) => {
    const params = { userId, type, isEnabled };
    const result = await getApps(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 4: update_app
// ==========================================
const UPDATE_APP_DESC = 'Updates an existing app\'s metadata in the SQLite repository. Note: The type field is immutable and cannot be changed via this operation. Updates can include name, description, icon, order, enabled status, server configuration, metadata, changelog entries, and system instructions.';

appManagementMcpServer.registerTool(
  'app_management_update_app',
  {
    description: UPDATE_APP_DESC,
    inputSchema: updateAppSchemaFields,
  },
  async ({ userId, id, name, description, faIcon, order, type, componentPath, isEnabled, isServerSideEnabled, requiresPort, dependencies, optionalDependencies, version, latestVersion, isUpdateAvailable, appSystemInstructions, changelogVersion, changelogDate, changelogNotes, changelogBreakingChangesMessages, changelogMigrationGuide, metadataCategory, metadataAuthor, metadataVersion, metadataTags, serverEntry, serverPort, serverEnv }) => {
    const params = { userId, id, name, description, faIcon, order, type, componentPath, isEnabled, isServerSideEnabled, requiresPort, dependencies, optionalDependencies, version, latestVersion, isUpdateAvailable, appSystemInstructions, changelogVersion, changelogDate, changelogNotes, changelogBreakingChangesMessages, changelogMigrationGuide, metadataCategory, metadataAuthor, metadataVersion, metadataTags, serverEntry, serverPort, serverEnv };
    const result = await updateApp(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 5: delete_app
// ==========================================
const DELETE_APP_DESC =
  'Removes an app record from the SQLite repository and deletes its physical directory. For browser/hybrid apps, removes the componentPath directory. For server apps, removes the server entry directory. Protected foundational apps (forms-builder, task-list, crm) cannot be deleted.';

appManagementMcpServer.registerTool(
  'app_management_delete_app',
  {
    description: DELETE_APP_DESC,
    inputSchema: deleteAppSchemaFields,
  },
  async ({ userId, id }) => {
    const params = { userId, id };
    const result = await deleteApp(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 6: add_table
// ==========================================
const ADD_TABLE_DESC = 'Creates a new table in an app\'s isolated SQLite database. Requires the app ID, table name, and CREATE TABLE SQL schema. Optionally accepts ifNotExists flag.';

appManagementMcpServer.registerTool(
  'app_management_add_table',
  {
    description: ADD_TABLE_DESC,
    inputSchema: addTableSchemaFields,
  },
  async ({ userId, id, tableName, schema, ifNotExists }) => {
    const params = { userId, id, tableName, schema, ifNotExists };
    const result = await handleAddTable(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 7: remove_table
// ==========================================
const REMOVE_TABLE_DESC = 'Removes a table from an app\'s isolated SQLite database, deleting all data in the process. Requires app ID and table name.';

appManagementMcpServer.registerTool(
  'app_management_remove_table',
  {
    description: REMOVE_TABLE_DESC,
    inputSchema: removeTableSchemaFields,
  },
  async ({ userId, id, tableName }) => {
    const params = { userId, id, tableName };
    const result = await handleRemoveTable(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 8: add_column
// ==========================================
const ADD_COLUMN_DESC = 'Adds a new column to an existing table in an app\'s isolated SQLite database. Requires app ID, table name, column name, and column type. Optional parameters include nullable, default value, primary key, and foreign key.';

appManagementMcpServer.registerTool(
  'app_management_add_column',
  {
    description: ADD_COLUMN_DESC,
    inputSchema: addColumnSchemaFields,
  },
  async ({ userId, id, tableName, columnName, columnType, nullable, defaultSchema, primaryKey, foreignKey }) => {
    const params = { userId, id, tableName, columnName, columnType, nullable, defaultSchema, primaryKey, foreignKey };
    const result = await handleAddColumn(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 9: remove_column
// ==========================================
const REMOVE_COLUMN_DESC = 'Removes a column from an existing table in an app\'s isolated SQLite database. Requires app ID, table name, and column name. Optionally accepts cascadeForeignKeys flag.';

appManagementMcpServer.registerTool(
  'app_management_remove_column',
  {
    description: REMOVE_COLUMN_DESC,
    inputSchema: removeColumnSchemaFields,
  },
  async ({ userId, id, tableName, columnName, cascadeForeignKeys }) => {
    const params = { userId, id, tableName, columnName, cascadeForeignKeys };
    const result = await handleRemoveColumn(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 10: select
// ==========================================
const SELECT_DESC = 'Executes a SELECT query on an app\'s isolated SQLite database. Supports parameterized queries for safety via sqlParams array. Optional limit and offset parameters.';

appManagementMcpServer.registerTool(
  'app_management_select',
  {
    description: SELECT_DESC,
    inputSchema: selectSchemaFields,
  },
  async ({ userId, id, sql, sqlParams, limit, offset }) => {
    const params = { userId, id, sql, sqlParams, limit, offset };
    const result = await handleSelect(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 11: insert
// ==========================================
const INSERT_DESC = 'Inserts a new record into an app\'s isolated SQLite database. Requires app ID, table name, and data object with column names as keys.';

appManagementMcpServer.registerTool(
  'app_management_insert',
  {
    description: INSERT_DESC,
    inputSchema: insertSchemaFields,
  },
  async ({ userId, id, tableName, data, returning }) => {
    const params = { userId, id, tableName, data, returning };
    const result = await handleInsert(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 12: update
// ==========================================
const UPDATE_DESC = 'Updates records in an app\'s isolated SQLite database. Requires app ID, table name, data object for updates, and where object for filtering. Optional returning flag.';

appManagementMcpServer.registerTool(
  'app_management_update',
  {
    description: UPDATE_DESC,
    inputSchema: updateSchemaFields,
  },
  async ({ userId, id, tableName, data, where, returning }) => {
    const params = { userId, id, tableName, data, where, returning };
    const result = await handleUpdate(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 13: delete
// ==========================================
const DELETE_DESC = 'Deletes records from an app\'s isolated SQLite database. Requires app ID, table name, and where object for filtering. Optional cascade flag.';

appManagementMcpServer.registerTool(
  'app_management_delete',
  {
    description: DELETE_DESC,
    inputSchema: deleteSchemaFields,
  },
  async ({ userId, id, tableName, where, cascade }) => {
    const params = { userId, id, tableName, where, cascade };
    const result = await handleDelete(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// TOOL 14: execute_raw
// ==========================================
const EXECUTE_RAW_DESC = 'Executes arbitrary SQL statements on an app\'s isolated SQLite database. Use with caution - this bypasses parameterized query safety. For SELECT operations, prefer the select tool.';

appManagementMcpServer.registerTool(
  'app_management_execute_raw',
  {
    description: EXECUTE_RAW_DESC,
    inputSchema: executeRawSchemaFields,
  },
  async ({ userId, id, sql }) => {
    const params = { userId, id, sql };
    const result = await handleExecuteRaw(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const appManagementToolsManifest = [
  {
    id: 'app_management_create_app',
    name: 'App Management - Create App',
    description: CREATE_APP_DESC,
    params: createAppSchemaFields,
  },
  {
    id: 'app_management_get_app',
    name: 'App Management - Get App',
    description: GET_APP_DESC,
    params: getAppSchemaFields,
  },
  {
    id: 'app_management_get_apps',
    name: 'App Management - Get Apps',
    description: GET_APPS_DESC,
    params: getAppsSchemaFields,
  },
  {
    id: 'app_management_update_app',
    name: 'App Management - Update App',
    description: UPDATE_APP_DESC,
    params: updateAppSchemaFields,
  },
  {
    id: 'app_management_delete_app',
    name: 'App Management - Delete App',
    description: DELETE_APP_DESC,
    params: deleteAppSchemaFields,
  },
  {
    id: 'app_management_add_table',
    name: 'App Management - Add Table',
    description: ADD_TABLE_DESC,
    params: addTableSchemaFields,
  },
  {
    id: 'app_management_remove_table',
    name: 'App Management - Remove Table',
    description: REMOVE_TABLE_DESC,
    params: removeTableSchemaFields,
  },
  {
    id: 'app_management_add_column',
    name: 'App Management - Add Column',
    description: ADD_COLUMN_DESC,
    params: addColumnSchemaFields,
  },
  {
    id: 'app_management_remove_column',
    name: 'App Management - Remove Column',
    description: REMOVE_COLUMN_DESC,
    params: removeColumnSchemaFields,
  },
  {
    id: 'app_management_select',
    name: 'App Management - Select',
    description: SELECT_DESC,
    params: selectSchemaFields,
  },
  {
    id: 'app_management_insert',
    name: 'App Management - Insert',
    description: INSERT_DESC,
    params: insertSchemaFields,
  },
  {
    id: 'app_management_update',
    name: 'App Management - Update',
    description: UPDATE_DESC,
    params: updateSchemaFields,
  },
  {
    id: 'app_management_delete',
    name: 'App Management - Delete',
    description: DELETE_DESC,
    params: deleteSchemaFields,
  },
  {
    id: 'app_management_execute_raw',
    name: 'App Management - Execute Raw',
    description: EXECUTE_RAW_DESC,
    params: executeRawSchemaFields,
  },
];
