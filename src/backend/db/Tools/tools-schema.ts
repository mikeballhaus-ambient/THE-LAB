import type { Database, Statement } from 'better-sqlite3';

export const createToolsTable = `
  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createIndexes = `
  CREATE INDEX IF NOT EXISTS idx_tools_order ON tools(id);
`;

export const seedTools = `
  INSERT OR IGNORE INTO tools (id, name, description)
  VALUES
    ('create_directory', 'Create Directory', 'Creates a new directory or full nested directory structure on the filesystem.'),
    ('remove_directory', 'Remove Directory', 'Removes a directory from the filesystem.'),
    ('context7_resolve_library_id', 'Context7 - Resolve Library ID', 'Resolves a general programming library name into a Context7-compatible unique library ID format (e.g., "/facebook/react").'),
    ('context7_query_docs', 'Context7 - Query Docs', 'Retrieves up-to-date documentation, type specs, and verified implementation code examples using a valid Context7 library ID.'),
    ('app_management_create_app', 'App Management - Create App', 'Creates a new app entry with metadata and scaffolds file structure. Generates app directory, creates isolated SQLite database with standard tables (items, users, configs, logs), and initializes app configuration.'),
    ('app_management_get_app', 'App Management - Get App', 'Retrieves a single app record by its unique ID from the SQLite repository. Returns complete app metadata including server configuration and changelog entries.'),
    ('app_management_get_apps', 'App Management - Get Apps', 'Lists all apps in the repository with optional filtering by type (browser/server/hybrid) and enabled status. Returns array of app objects.'),
    ('app_management_update_app', 'App Management - Update App', 'Updates an existing app''s metadata in the SQLite repository. Note: The type field is immutable and cannot be changed via this operation. Updates can include name, description, icon, order, enabled status, server configuration, metadata, changelog entries, and system instructions.'),
    ('app_management_delete_app', 'App Management - Delete App', 'Removes an app record from the SQLite repository and deletes its physical directory. For browser/hybrid apps, removes the componentPath directory. For server apps, removes the server entry directory.'),
    ('app_management_add_table', 'App Management - Add Table', 'Creates a new table in an app''s isolated SQLite database. Requires the app ID, table name, and CREATE TABLE SQL schema. Optionally accepts ifNotExists flag.'),
    ('app_management_remove_table', 'App Management - Remove Table', 'Removes a table from an app''s isolated SQLite database, deleting all data in the process. Requires app ID and table name.'),
    ('app_management_add_column', 'App Management - Add Column', 'Adds a new column to an existing table in an app''s isolated SQLite database. Requires app ID, table name, column name, and column type. Optional parameters include nullable, default value, primary key, and foreign key.'),
    ('app_management_remove_column', 'App Management - Remove Column', 'Removes a column from an existing table in an app''s isolated SQLite database. Requires app ID, table name, and column name. Optionally accepts cascadeForeignKeys flag.'),
    ('app_management_select', 'App Management - Select', 'Executes a SELECT query on an app''s isolated SQLite database. Supports parameterized queries for safety via sqlParams array. Optional limit and offset parameters.'),
    ('app_management_insert', 'App Management - Insert', 'Inserts a new record into an app''s isolated SQLite database. Requires app ID, table name, and data object with column names as keys.'),
    ('app_management_update', 'App Management - Update', 'Updates records in an app''s isolated SQLite database. Requires app ID, table name, data object for updates, and where object for filtering. Optional returning flag.'),
    ('app_management_delete', 'App Management - Delete', 'Deletes records from an app''s isolated SQLite database. Requires app ID, table name, and where object for filtering. Optional cascade flag.'),
    ('app_management_execute_raw', 'App Management - Execute Raw', 'Executes arbitrary SQL statements on an app''s isolated SQLite database. Use with caution - this bypasses parameterized query safety. For SELECT operations, prefer the select tool.'),
    ('create_file', 'Create File', 'Creates a new file on the filesystem with optional content, supporting overwrite and auto-directory creation. Parameters: path (required), content (optional), overwrite (boolean, default false), ensureDir (boolean, default false).'),
    ('list_files', 'List Files', 'Lists files and directories within a specified filesystem path. Supports recursive or non-recursive traversal with configurable result limits.'),
    ('read_file', 'Read File', 'Reads text-based files from the filesystem with optional pagination and type/lint checking. Returns content with metadata prefix indicating line numbers (START, TOTAL, RETURNED).'),
    ('remove_file', 'Remove File', 'Removes a file or directory from the filesystem.'),
    ('update_file_get_line_content', 'Update File - Get Line Content', 'Retrieves exact line content from a file with optional context window (+/- 2 lines). Returns the precise text at the specified line number.'),
    ('update_file_get_diff_template', 'Update File - Get Diff Template', 'Generates a pre-validated diff template for a specified line range in a file. Use this to create accurate patch templates before applying changes with update_file.'),
    ('update_file_update_file', 'Update File - Update File', 'Applies structured diff patches to an existing file. Each patch specifies line changes with original and updated content. Supports additions, replacements, and deletions.'),
    ('todo_list_create_list', 'Todo List - Create List', 'Creates a new todo list with the specified name and ID. The list starts empty with completed=false.'),
    ('todo_list_add_todo_item', 'Todo List - Add Todo Item', 'Adds a new todo item to an existing todo list. Optionally includes a code task with type, priority, and dependencies.'),
    ('todo_list_update_todo_item', 'Todo List - Update Todo Item', 'Updates an existing todo item in a todo list with new text, data, or optional code task.'),
    ('todo_list_mark_todo_item_completed', 'Todo List - Mark Todo Item Completed', 'Marks a todo item as completed and updates the list completion status if all items are done.'),
    ('todo_list_mark_todo_item_incomplete', 'Todo List - Mark Todo Item Incomplete', 'Reverts a todo item to incomplete status.'),
    ('todo_list_complete_todo_list', 'Todo List - Complete Todo List', 'Manually marks a todo list as completed.'),
    ('todo_list_get_todo_list_state', 'Todo List - Get Todo List State', 'Returns the full state of a todo list including all items.'),
    ('todo_list_list_todo_lists', 'Todo List - List Todo Lists', 'Lists all available todo lists for the current session, optionally limited by count.'),
    ('todo_list_remove_todo_list', 'Todo List - Remove Todo List', 'Deletes a todo list and all its items.'),
    ('todo_list_remove_todo_item', 'Todo List - Remove Todo Item', 'Deletes a single todo item from a todo list.'),
    ('web_fetch', 'Web Fetch', 'Fetches the raw contents of a URL over HTTP or HTTPS with a maximum response size limit of 10KB to prevent context overflow.'),
    ('web_query', 'Web Query', 'Performs a web search using the configured API and returns relevant results.'),
    ('persona_manager_switch_persona', 'Persona Manager - Switch Persona', 'Changes the current session''s active persona without creating a new session. Use this when you want to change how the AI assistant responds within the same conversation.'),
    ('persona_manager_activate_persona', 'Persona Manager - Activate Persona', 'Creates a new session with a specified persona, optionally initializing a todo list for task delegation. Use this when you need to delegate specific tasks to a specialized persona.'),
    ('persona_manager_response_persona', 'Persona Manager - Response Persona', 'Child persona returns control to parent with task results. Use this when a child persona has completed its work and needs to report back to the parent session.'),
    ('awaiter', 'Awaiter', 'Allows agents to pause for a specified duration, then THE-LAB resumes reasoning with any context message you provided — useful for rate limits, simulated delays, or waiting on external processes.'),
    ('run_terminal_command', 'Run Terminal Command', 'Execute terminal commands on the system and returns their output. Commands run synchronously via spawnSync with PowerShell shell, returning stdout + stderr on success or error details with exit code on failure.'),
    ('search_repository', 'Search Repository', 'Performs semantic pattern-based search across repository files using JavaScript regex patterns with optional glob filtering. Recursively searches directories relative to project root and returns matches with line numbers, matched content, and surrounding context.'),
    ('documentor_save_document', 'Documentor - Save Document', 'Writes complete markdown content to a file. Validates .md extension and handles overwrites based on the overwrite parameter.'),
    ('documentor_get_line_content', 'Documentor - Get Line Content', 'Retrieves exact line content from a markdown file with +/- 2 lines context.'),
    ('documentor_get_diff_template', 'Documentor - Get Diff Template', 'Generates a pre-validated diff template for a specified line range in a markdown file.'),
    ('documentor_update_document', 'Documentor - Update Document', 'Applies structured diff patches to modify documentation content in a markdown file.'),
    ('followup_generate_followup', 'Followup - Generate Followup', 'This tool generates interactive follow-up questions for user input in THE-LAB chat sessions. Agents can mix checkboxes and input fields freely in a single call.'),
    ('ui_automation_discover_elements', 'UI Automation - Discover Elements', 'Discovers UI elements with full DOM Context Data for a specified session and context area. Returns element details including tag, ID, classes, text content, attributes, position, and CSS selectors for targeting.'),
    ('ui_automation_element_action', 'UI Automation - Element Action', 'Performs batch actions on UI elements using CSS selectors. Supports click, doubleClick, hover, focus, blur, press, setValue, setAttribute, and removeAttribute actions. Actions execute sequentially with the specified order.'),
    ('awaiter', 'Awaiter', 'Allows agents to pause for a specified duration, then THE-LAB resumes reasoning with any context message you provided — useful for rate limits, simulated delays, or waiting on external processes.'),
    ('lab_integrations_list_bindings', 'Lab Integrations - List Bindings', 'Lists global integration bindings for a host app.'),
    ('lab_integrations_upsert_binding', 'Lab Integrations - Upsert Binding', 'Creates or updates a global integration binding; promotes provider into host dependencies when enabled.'),
    ('lab_integrations_delete_binding', 'Lab Integrations - Delete Binding', 'Deletes a binding, demotes unused host dependencies, and removes integration stub forms/charts when no binding references the same providerRef.'),
    ('lab_integrations_get_manifest', 'Lab Integrations - Get Manifest', 'Reads integration manifest for a host app from the app registry.'),
    ('lab_integrations_hub_discovery', 'Lab Integrations - Hub Discovery', 'Returns registry hub discovery contract for an integration service.'),
    ('lab_integrations_provision_form_stub', 'Lab Integrations - Provision Form Stub', 'Provisions a published stub form in Forms Builder app DB via platform API.'),
    ('lab_integrations_provision_chart_stub', 'Lab Integrations - Provision Chart Stub', 'Provisions a stub chart and data connector in Chart Builder app DB via platform API.'),
    ('lab_integrations_resolve_launch_deps', 'Lab Integrations - Resolve Launch Dependencies', 'Resolves effective launch dependency app ids for a host app.')
`;

export const toolsSQLStatementKeys = {
  // Queries
  tools_all: 'tools_all',
  tools_by_id: 'tools_by_id',

  // Statements
  insert_tool: 'insert_tool',
  upsert_tool: 'upsert_tool',
  update_tool: 'update_tool',
  delete_tool: 'delete_tool',
} as const;

export type ToolsSQLStatementKey = keyof typeof toolsSQLStatementKeys;

export const createToolsSQLStatements = (
  db: Database,
): Record<ToolsSQLStatementKey, Statement> => {
  const q = (sql: string) => db.prepare(sql);

  return {
    // Query statements
    [toolsSQLStatementKeys.tools_all]: q(`
      SELECT * FROM tools ORDER BY id ASC
    `),

    [toolsSQLStatementKeys.tools_by_id]: q(`
      SELECT * FROM tools WHERE id = ?
    `),

    // CRUD statements
    [toolsSQLStatementKeys.insert_tool]: q(`
      INSERT INTO tools (id, name, description)
      VALUES (?, ?, ?)
    `),

    // Catalogue reconciliation with the live MCP registry: a newly registered server must appear in
    // Settings → Personas → Tools without anyone hand-editing `seedTools`.
    [toolsSQLStatementKeys.upsert_tool]: q(`
      INSERT INTO tools (id, name, description)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `),

    [toolsSQLStatementKeys.update_tool]: q(`
      UPDATE tools
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `),

    [toolsSQLStatementKeys.delete_tool]: q(`
      DELETE FROM tools WHERE id = ?
    `),
  };
};
