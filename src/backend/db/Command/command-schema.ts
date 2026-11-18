import type { Database, Statement } from 'better-sqlite3';

export const createUserCommandsTable = `
  CREATE TABLE IF NOT EXISTS user_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    key TEXT NOT NULL,
    description TEXT NOT NULL,
    text TEXT NOT NULL,
    persona TEXT NOT NULL,
    argument_hints TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (userid, key)
  );
`

export const createUserCommandsIndex = `
  CREATE INDEX IF NOT EXISTS idx_user_commands_userid ON user_commands(userid);
  CREATE INDEX IF NOT EXISTS idx_user_commands_key ON user_commands(key);
`

export const seedDefaultAdminCommands = `
  INSERT OR REPLACE INTO user_commands (userid, key, description, text, persona, argument_hints, created_at, updated_at)
  VALUES ({{USERID}}, 'qa-review', 'This command performs a thorough and detailed quality review based on user information', '## Your task\\nBased on the <user-instructions> argument supplied by the user, perform a thorough and detailed quality review of the code\\n\\n## Output\\nSave your analysis report to docs/quality-assurance-review.md', 'QA', '["user-instructions"]', '2026-05-13T02:00:00', '2026-05-13T02:00:00');

  INSERT OR REPLACE INTO user_commands (userid, key, description, text, persona, argument_hints, created_at, updated_at)
  VALUES ({{USERID}}, 'create-mcp-tool', 'Create and register new MCP tool', '# IMPORTANT ARGUMENT RULES\\nWhen this command is invoked, you receive 6 arguments\\n- You MUST use <mcp-tool-filename> as the new file name\\n- You MUST use <mcp-tool-className> as the name of the new class\\n- You MUST use <mcp-tool-id> as the value for the id property\\n- You MUST use <mcp-tool-name> as the value for the name property\\n- You MUST use <mcp-tool-description> as the value for the description property\\n- The <mcp-functionality> argument is the requirements of the expected tool functionality\\n\\n----\\n\\n## Your task: Create then new MCP tool and register properly\\n\\n## Create new file\\n- Prior to creating the new MCP tool, refer to an existing Implementation\\n\\t- Reference the existing \`src/backend/mcp/tools/todo-list/ToDoListTool.ts\` file and follow the same coding patterns to create the new class\\n- Create the new MCP tool file (\`<mcp-tool-filename>\`) in the ./src/backend/mcp/tools folder\\n\\t- The zode schema for the new tool must reside in the existing \`src/shared/types/schemas.ts\`\\n\\n## Register new MCP tool\\n- After the new tool has been created, it must be registered\\n\\t- Registration occurs in the ./src/backend/server.ts file\\n\\t- Ensure to import your new class into server.ts\\n\\t- Add the new tool registration after the current existing tool registrations\\n- Add to sqlite [PLACEHOLDER]\\n- Update \`src/shared/data/sysMsg.md\` in the \`## Core Capabilities\` to include the new tool\\n- Add a method to the \`src//shared//composables//useMcpToolFormatter.ts\` file to handle output formatting for UI\\n- Add tests to the existing testing folder \`src//tests//mcp\` (follow existing test file patterns)\\n\\n---\\n\\n## Task Completion\\nWhen the new MCP tool has been created and registered, complete this task', 'Code', '["mcp-tool-filename", "mcp-tool-className", "mcp-tool-id", "mcp-tool-name", "mcp-tool-description", "mcp-functionality"]', '2026-05-13T02:00:00', '2026-05-13T02:...');

  INSERT OR REPLACE INTO user_commands (userid, key, description, text, persona, argument_hints, created_at, updated_at)
  VALUES ({{USERID}}, 'quick-task', 'This command uses the user-instructions argument as the basis for the orchestrator to create a todo list and generate sub‑tasks for the code agent', '## Your task\\nYou must reference the <user-instructions> argument supplied by the user\\n\\n**CRITICAL: If no <user-instructions> argument is supplied, politely ask the user "How can I help you today? "**\\n\\nYour responsibility is to:\\n\\n1. Interpret the user instructions  \\n2. Formulate a plan\\n3. Convert the plan into a clear, ordered TODO list  \\n4. Generate sub‑tasks for the code agent to implement each required fix  \\n\\nYou are not implementing code — you are producing the execution plan.\\n\\n---\\n\\n## Activity — Formulate a todo list of action items\\n- For each item in your todo list, you must:\\n\\t- Generate a corresponding sub‑task instructing the code agent to implement the user instructions \\n\\nEach sub‑task must reflect the user instructions intent precisely.\\n**CRITICAL: Do NOT switch to code mode, you must create a sub task for each todo item and assign to the code agent to complete**\\nInstruct the code agent to immediatley return control to the orchestrator when the sub task has been completed\\n\\n---\\n\\n## CRITICAL RULES\\nYou must **not**:\\n\\n- Call any tools  \\n- Modify files  \\n- Execute code  \\n- Create directories  \\n\\nYour sole responsibility is to produce the TODO list and delegate the sub‑tasks to the code agent.', 'Orchestrator', '["user-instructions"]', '2026-05-13T02:00:00', '2026-05-13T02:00:00');

  INSERT OR REPLACE INTO user_commands (userid, key, description, text, persona, argument_hints, created_at, updated_at)
  VALUES  ({{USERID}}, 'sdlc', 'Coordinates all agents to execute a complete software development lifecycle for a new feature or refactor.', '# SDLC Workflow\\n\\nYour responsibility as the **Orchestrator** is to guide the user through a full SDLC workflow, delegating tasks to the Architect, Code, QA, and Debug agents as needed.\\n\\n---\\n\\n# Step 1 — Understand the User\u2019s Request\\n\\n- Engage the user in conversation until you have a **complete and unambiguous understanding** of the feature or refactor they want.\\n- Ask clarifying questions until the scope, goals, constraints, and acceptance criteria are fully understood.\\n- When you are confident the request is fully defined, proceed to Step 2.\\n\\n---\\n\\n# Step 2 — Requirements Documentation (Architect)\\n\\nDelegate a subtask to the **Architect agent** with the following instructions:\\n\\n### Architect Instructions\\n- You are functioning as the **Architect**.\\n- Create a new folder inside \`docs/\` named after the feature or refactor (kebab-case).\\n  - This folder becomes the root for all SDLC documentation.\\n- Create a \`requirements.md\` file in that folder containing **detailed, explicit requirements**:\\n  - Overall objectives\\n  - Functional requirements\\n  - Non-functional requirements\\n  - Constraints\\n  - Acceptance criteria\\n- Use **Context7** for any framework‑related details to ensure up‑to‑date accuracy.\\n- If requirements exceed ~500 lines or represent a large effort, split them into:\\n  - \`phase-1-requirements.md\`\\n  - \`phase-2-requirements.md\`\\n  - etc.\\n- When finished, signal completion and return control to the Orchestrator, including the folder path.\\n\\n---\\n\\n# Step 3 — Architectural Design (Architect)\\n\\nDelegate a new subtask to the **Architect agent** with the following instructions:\\n\\n### Architect Instructions\\n- You are functioning as the **Architect**.\\n- Your responsibility is to **design the architecture or refactor plan only**.\\n- Use the requirements created in Step 2 as the sole source of truth.\\n- Do NOT implement code, write tests, or modify existing files.\\n- Produce a comprehensive design document that includes:\\n  - System overview and context\\n  - Component diagrams (ASCII or Mermaid)\\n  - Data flow descriptions\\n  - API specifications\\n  - Database schema changes\\n  - Security considerations\\n  - Performance requirements\\n  - Error handling strategy\\n- When complete, return control to the Orchestrator with the design document path.\\n\\n---\\n\\n# Step 4 — Implementation (Code)\\n\\nDelegate a subtask to the **Code agent** with:\\n- The requirements from Step 2\\n- The design from Step 3\\n- Instructions to implement the solution following best practices\\n\\n---\\n\\n# Step 5 — Quality Assurance (QA)\\n\\nDelegate a subtask to the **QA agent** to:\\n- Review the implementation against requirements and design\\n- Identify potential issues, edge cases, or missing scenarios\\n- Suggest improvements or additional test cases\\n\\n---\\n\\n# Step 6 — Debugging (Debug)\\n\\nDelegate a subtask to the **Debug agent** to:\\n- Address any issues identified during implementation or QA\\n- Ensure all tests pass\\n- Verify the solution meets all acceptance criteria\\n\\n---\\n\\n## Core Capabilities\\n\\n### MCP Tools Available\\n- \`create-mcp-tool\` - Create and register new MCP tools\\n- \`todo-list\` - Manage task lists and subtasks\\n- \`search-repository\` - Search codebase for implementation references\\n\\n### Agent Collaboration Rules\\n1. Always delegate to the appropriate agent for each phase\\n2. Return control to Orchestrator after completing your assigned task\\n3. Reference previous steps'' outputs when relevant\\n4. Communicate clearly about blockers or questions', 'Architect', '[]', '2026-05-13T02:00:00', '2026-05-13T02:00:00');
`;

export const CommandSQLStatementKeys = {
  // Queries
  selectByKey: 'selectByKey',
  selectAll: 'selectAll',
  selectByUserId: 'selectByUserId',
  selectByPersona: 'selectByPersona',
  selectByUserIdAndKey: 'selectByUserIdAndKey',

  // CRUD statements
  insert: 'insert',
  update: 'update',
  delete: 'delete',
} as const;

export type CommandSQLStatementKey = typeof CommandSQLStatementKeys[keyof typeof CommandSQLStatementKeys]

export function createCommandsSQLStatements(
  db: Database,
): Record<CommandSQLStatementKey, Statement> {
  const q = (sql: string) => db.prepare(sql);

  return {
    // Query statements
    [CommandSQLStatementKeys.selectByKey]: q(`
      SELECT * FROM user_commands WHERE key = ? AND userid = ?
    `),

    [CommandSQLStatementKeys.selectAll]: q(`
      SELECT * FROM user_commands ORDER BY created_at ASC
    `),

    [CommandSQLStatementKeys.selectByUserId]: q(`
      SELECT * FROM user_commands WHERE userid = ? ORDER BY created_at ASC
    `),

    [CommandSQLStatementKeys.selectByPersona]: q(`
      SELECT * FROM user_commands WHERE persona = ? AND userid = ? ORDER BY created_at ASC
    `),

    [CommandSQLStatementKeys.selectByUserIdAndKey]: q(`
      SELECT * FROM user_commands WHERE userid = ? AND key = ?
    `),

    // CRUD statements
    [CommandSQLStatementKeys.insert]: q(`
      INSERT INTO user_commands (userid, key, description, text, persona, argument_hints, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

    [CommandSQLStatementKeys.update]: q(`
      UPDATE user_commands
      SET description = ?, text = ?, persona = ?, argument_hints = ?, updated_at = ?
      WHERE userid = ? AND key = ?
    `),

    // Delete statement
    [CommandSQLStatementKeys.delete]: q(`
      DELETE FROM user_commands WHERE userid = ? AND key = ?
    `),
  };
};
