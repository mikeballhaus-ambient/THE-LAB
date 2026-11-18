import { z } from 'zod';

/**
 * Schema for App Management MCP tool parameters - create_app
 */
export const createAppSchemaFields = z.object({
  userId: z.number().describe('REQUIRED for ALL operations. Obtained from System Instructions {{userId}} context.'),
  type: z.enum(['browser', 'server', 'hybrid']).describe('Type of app: browser, server, or hybrid'),
  name: z.string().describe('Human-readable name of the app'),
  description: z.string().describe('Description of the app'),
  faIcon: z.string().describe('Font Awesome icon class (e.g., "fa-music")'),
  order: z.number().int().positive().optional().describe('Display order number (positive integer)'),
  componentPath: z.string().optional().describe('Path to the app component'),
  isEnabled: z.boolean().optional().describe('Whether the app is enabled'),
  isServerSideEnabled: z.boolean().optional().describe('Whether server-side features are enabled'),
  serverEntry: z.string().optional().nullable().describe('Path to entry point'),
  serverPort: z.number().optional().nullable().describe('Port number to listen on'),
  serverEnv: z.record(z.string(), z.string()).optional().nullable().describe('Environment variables for app'),
  version: z.string().optional().describe('App version string'),
  changelogVersion: z.string().optional().nullable().describe('Change log version string (e.g., "1.0.0")'),
  changelogDate: z.string().optional().nullable().describe('Change log date string'),
  changelogNotes: z.string().optional().nullable().describe('Change log notes'),
  changelogBreakingChangesMessages: z.array(z.string()).optional().nullable().describe('Array of breaking change messages for this version'),
  changelogMigrationGuide: z.string().optional().nullable().describe('Migration guide for this version'),
  latestVersion: z.string().optional().describe('Latest version string'),
  isUpdateAvailable: z.boolean().optional().describe('Whether an update is available'),
  metadataCategory: z.string().optional().nullable().describe('Application category'),
  metadataAuthor: z.string().optional().nullable().describe('App author'),
  metadataVersion: z.string().optional().nullable().describe('App version'),
  metadataTags: z.array(z.string()).optional().nullable().describe('Tags for categorization'),
  catalogTagIds: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Platform home catalog section ids (primary first). Missing tags are auto-created with labels derived from the id slug.',
    ),
  catalogTags: z
    .array(
      z.object({
        id: z
          .string()
          .min(2)
          .max(64)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be lowercase slug'),
        label: z.string().min(1).max(120).optional(),
        description: z.string().max(500).optional(),
        sortOrder: z.number().int().positive().optional(),
      }),
    )
    .optional()
    .describe(
      'Preferred: platform catalog tags to ensure + link after scaffold (primary first). Creates missing tags.',
    ),
  dependencies: z.array(z.string()).optional().describe('Array of direct dependencies'),
  optionalDependencies: z.array(z.string()).optional().describe('Array of optional dependencies'),
  requiresPort: z.number().nullable().optional().describe('Specific port requirement'),
  appSystemInstructions: z.string().optional().describe('System instructions for the app')
});

export type CreateAppParamsSchema = z.infer<typeof createAppSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - get_app
 */
export const getAppSchemaFields = z.object({
  userId: z.number().describe('REQUIRED for ALL operations.'),
  id: z.string().describe('Unique identifier for the app')
});

export type GetAppParamsSchema = z.infer<typeof getAppSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - get_apps
 */
export const getAppsSchemaFields = z.object({
  userId: z.number().describe('REQUIRED for ALL operations.'),
  type: z.enum(['browser', 'server', 'hybrid']).optional().describe('Filter apps by type'),
  isEnabled: z.boolean().optional().describe('Filter apps by enabled status')
});

export type GetAppsParamsSchema = z.infer<typeof getAppsSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - update_app
 */
export const updateAppSchemaFields = z.object({
  userId: z.number().describe('REQUIRED for ALL operations.'),
  id: z.string().describe('Unique identifier for the app'),
  name: z.string().optional().describe('Human-readable name of the app'),
  description: z.string().optional().describe('Description of the app'),
  faIcon: z.string().optional().describe('Font Awesome icon class'),
  order: z.number().int().positive().optional().describe('Display order number'),
  type: z.enum(['browser', 'server', 'hybrid']).optional().describe('Type of app (immutable - will be ignored)'),
  componentPath: z.string().optional().describe('Path to the app component'),
  isEnabled: z.boolean().optional().describe('Whether the app is enabled'),
  isServerSideEnabled: z.boolean().optional().describe('Whether server-side features are enabled'),
  requiresPort: z.number().nullable().optional().describe('Specific port requirement'),
  dependencies: z.array(z.string()).optional().describe('Array of direct dependencies'),
  optionalDependencies: z.array(z.string()).optional().describe('Array of optional dependencies'),
  version: z.string().optional().describe('App version string'),
  latestVersion: z.string().optional().describe('Latest version string'),
  isUpdateAvailable: z.boolean().optional().describe('Whether an update is available'),
  appSystemInstructions: z.string().optional().describe('System instructions for the app'),
  changelogVersion: z.string().optional().nullable().describe('Change log version string'),
  changelogDate: z.string().optional().nullable().describe('Change log date string'),
  changelogNotes: z.string().optional().nullable().describe('Change log notes'),
  changelogBreakingChangesMessages: z.array(z.string()).optional().nullable().describe('Array of breaking change messages'),
  changelogMigrationGuide: z.string().optional().nullable().describe('Migration guide for this version'),
  metadataCategory: z.string().optional().nullable().describe('Application category'),
  metadataAuthor: z.string().optional().nullable().describe('App author'),
  metadataVersion: z.string().optional().nullable().describe('App version'),
  metadataTags: z.array(z.string()).optional().nullable().describe('Tags for categorization'),
  serverEntry: z.string().optional().nullable().describe('Path to entry point'),
  serverPort: z.number().optional().nullable().describe('Port number to listen on'),
  serverEnv: z.record(z.string(), z.string()).optional().nullable().describe('Environment variables for app')
});

export type UpdateAppParamsSchema = z.infer<typeof updateAppSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - delete_app
 */
export const deleteAppSchemaFields = z.object({
  userId: z.number().describe('REQUIRED for ALL operations.'),
  id: z.string().describe('Unique identifier for the app')
});

export type DeleteAppParamsSchema = z.infer<typeof deleteAppSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - add_table
 */
export const addTableSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app (required for database operations)'),
  tableName: z.string().describe('Name of the table to create'),
  schema: z.string().describe('CREATE TABLE SQL statement'),
  ifNotExists: z.boolean().default(false).optional().describe('Whether to create table only if it does not exist')
});

export type AddTableParamsSchema = z.infer<typeof addTableSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - remove_table
 */
export const removeTableSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  tableName: z.string().describe('Name of the table to remove')
});

export type RemoveTableParamsSchema = z.infer<typeof removeTableSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - add_column
 */
export const addColumnSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  tableName: z.string().describe('Name of the table to add column to'),
  columnName: z.string().describe('Name of the column to add'),
  columnType: z.enum(['INTEGER', 'TEXT', 'REAL', 'BLOB', 'BOOLEAN', 'TIMESTAMP', 'JSON', 'ANY']).describe('SQL column type'),
  nullable: z.boolean().default(false).optional().describe('Whether the column can contain NULL values'),
  defaultSchema: z.any().optional().describe('Default value for the column'),
  primaryKey: z.boolean().default(false).optional().describe('Whether the column is a primary key'),
  foreignKey: z.string().optional().describe('Column name that this column references')
});

export type AddColumnParamsSchema = z.infer<typeof addColumnSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - remove_column
 */
export const removeColumnSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  tableName: z.string().describe('Name of the table to remove column from'),
  columnName: z.string().describe('Name of the column to remove'),
  cascadeForeignKeys: z.boolean().default(false).optional().describe('Whether to cascade delete foreign keys')
});

export type RemoveColumnParamsSchema = z.infer<typeof removeColumnSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - select
 */
export const selectSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  sql: z.string().describe('SQL query to execute'),
  sqlParams: z.any().optional().describe('Parameters for prepared SQL statement'),
  limit: z.number().optional().default(1000).describe('Maximum number of rows to return'),
  offset: z.number().optional().default(0).describe('Number of rows to skip')
});

export type SelectParamsSchema = z.infer<typeof selectSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - insert
 */
export const insertSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  tableName: z.string().describe('Name of the table to insert into'),
  data: z.record(z.string(), z.any()).describe('Data to insert as key-value pairs'),
  returning: z.boolean().default(false).optional().describe('Whether to return inserted row')
});

export type InsertParamsSchema = z.infer<typeof insertSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - update
 */
export const updateSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  tableName: z.string().describe('Name of the table to update'),
  data: z.record(z.string(), z.any()).describe('Data to update as key-value pairs'),
  where: z.record(z.string(), z.any()).describe('WHERE clause conditions as key-value pairs'),
  returning: z.boolean().default(false).optional().describe('Whether to return updated rows')
});

export type UpdateParamsSchema = z.infer<typeof updateSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - delete
 */
export const deleteSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  tableName: z.string().describe('Name of the table to delete from'),
  where: z.record(z.string(), z.any()).describe('WHERE clause conditions as key-value pairs'),
  cascade: z.boolean().default(false).optional().describe('Whether to cascade delete related rows')
});

export type DeleteParamsSchema = z.infer<typeof deleteSchemaFields>;

/**
 * Schema for App Management MCP tool parameters - execute_raw
 */
export const executeRawSchemaFields = z.object({
  userId: z.number().optional(),
  id: z.string().describe('Unique identifier for the app'),
  sql: z.string().describe('SQL statement to execute')
});

export type ExecuteRawParamsSchema = z.infer<typeof executeRawSchemaFields>;
