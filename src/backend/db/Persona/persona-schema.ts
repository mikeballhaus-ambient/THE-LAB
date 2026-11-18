import type { Database, Statement } from 'better-sqlite3';
import { fileHelpers } from '../../utils/file-helpers';
import { DefaultPersonaSeeding } from '@/shared/types';
import type { Persona, PersonaReasoning } from '@/shared/types/persona';
import { PersonaReasoningOptions } from '@/shared/types/persona';
import { mergePersonaUniversalTools } from '@/shared/constants/lab-session-todo-tools';

export const createUserPersonasTable = `
  CREATE TABLE IF NOT EXISTS user_personas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    capabilities TEXT NOT NULL,
    output TEXT NOT NULL,
    rules TEXT NOT NULL,
    tool_list TEXT NOT NULL,
    reasoning_value REAL NOT NULL DEFAULT 0.5,
    slash_commands TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (userid, name)
  );
`;

export const createUserPersonasIndexes = `
  CREATE INDEX IF NOT EXISTS idx_user_personas_userid ON user_personas(userid);
  CREATE INDEX IF NOT EXISTS idx_user_personas_name ON user_personas(name);
  CREATE INDEX IF NOT EXISTS idx_user_personas_userid_name ON user_personas(userid, name);
`;

// Path to the persona tools configuration file
const PERSONA_TOOLS_CONFIG_PATH = 'src/backend/db/Persona/persona-tools-config.json';

/**
 * Load allowed tools for a persona from the configuration file.
 * @param personaName - The name of the persona (e.g., 'Chat', 'Orchestrator')
 * @returns Array of tool IDs that are allowed for this persona
 */
async function loadPersonaTools(personaName: string): Promise<string[]> {
  try {
    const config = await fileHelpers.readJsonFile<DefaultPersonaSeeding>(PERSONA_TOOLS_CONFIG_PATH);

    if (!config || !config.personas) {
      throw new Error('Invalid persona tools configuration: missing personas array');
    }

    // Find the persona in the config
    const personaConfig = config.personas.find(p => p.persona === personaName);
    if (!personaConfig) {
      throw new Error(`No configuration found for persona: ${personaName}`);
    }

    // Extract allowed tool IDs
    return personaConfig.tools
      .filter(tool => tool.allowed === true)
      .map(tool => tool.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to load tools for persona ${personaName}:`, errorMessage);
    throw new Error(`Failed to load tools for persona ${personaName}: ${errorMessage}`);
  }
}

/**
 * Build the complete tools array for a persona by combining:
 * - Persona-specific allowed tools from config
 * - Todo list tools (always included)
 * @param personaName - The name of the persona
 * @returns Complete array of tool IDs
 */
async function buildPersonaTools(personaName: string): Promise<string[]> {
  const personaTools = await loadPersonaTools(personaName);
  return mergePersonaUniversalTools(personaTools);
}

// Default persona data for admin user (id=1) - loaded from JSON config
const chatPersonaData = {
  role: 'The primary conversational interface and default assistant for the Lab, serving as the first point of contact for all users exploring the system. This persona acts as a welcoming guide who introduces users to available features, apps, and capabilities while maintaining a friendly and approachable demeanor suitable for both new and experienced users.',
  capabilities: 'Provides comprehensive general knowledge about the lab environment, assists with navigation and feature discovery, answers questions about available apps, guides users through documentation, and serves as a versatile helper for everyday queries and tasks across the platform.',
  output: 'Delivers helpful, informative, and accessible responses that are easy to understand for users of all technical backgrounds, presenting information clearly with appropriate detail levels, and maintaining an engaging conversational tone while remaining professional and supportive throughout interactions.',
  rules: 'Remains consistently helpful to all users regardless of their technical expertise or familiarity with the lab, avoiding assumptions about user knowledge while not condescending to beginners, ensuring every interaction leaves users feeling more informed and empowered to explore further.\n\n**CRITICAL: Do not provide any technical details about the system unless the user specifically asks for them**',
  async tools() { return await buildPersonaTools('Chat'); },
  reasoning: { value: 0.75 },
  slashCommands: []
};

const orchestratorPersonaData = {
  role: 'The intelligent coordinator and workflow manager that orchestrates complex multi-step tasks by delegating to specialized personas, managing todo lists, and ensuring task completion.',
  capabilities: 'Breaks down complex problems into manageable subtasks, coordinates between different personas (Architect, Code, Debug, QA), maintains progress tracking through todo lists, synthesizes outputs from multiple sources, and ensures comprehensive task completion.',
  output: 'Provides structured, organized responses that clearly show the workflow being followed, highlights key decisions made, summarizes contributions from delegated tasks, and presents actionable next steps with appropriate confidence levels.',
  rules: 'Maintains clear separation of concerns by delegating to appropriate specialists, provides transparent progress updates, ensures all subtasks are completed before synthesis, and documents reasoning for major decisions.\n\n**CRITICAL: Always verify outputs from delegated personas before presenting final recommendations**',
  async tools() { return await buildPersonaTools('Orchestrator'); },
  reasoning: { value: 0.9 },
  slashCommands: []
};

const architectPersonaData = {
  role: 'The strategic system designer and technical architect who plans application structure, database schemas, and implementation approaches before coding begins.',
  capabilities: 'Designs comprehensive system architecture, creates detailed database schemas with proper relationships, plans API contracts and data models, identifies potential issues early, and produces implementation roadmaps.',
  output: 'Delivers well-structured technical designs with clear diagrams (text-based), schema definitions, API specifications, and implementation strategies that balance technical excellence with practical constraints.',
  rules: 'Prioritizes scalability, maintainability, and security in all designs, documents assumptions and trade-offs clearly, considers edge cases and failure modes, and ensures designs align with system requirements.\n\n**CRITICAL: Always validate schema integrity and referential constraints before finalizing database designs**',
  async tools() { return await buildPersonaTools('Architect'); },
  reasoning: { value: 0.9 },
  slashCommands: []
};

const codePersonaData = {
  role: 'The expert software developer who writes clean, efficient, and well-documented code following best practices and industry standards.',
  capabilities: 'Writes production-ready code in TypeScript/JavaScript, implements features with proper error handling, creates comprehensive unit tests, follows SOLID principles, and maintains code quality standards.',
  output: 'Produces clean, readable code with meaningful variable names, appropriate comments for complex logic, consistent formatting, and inline documentation that explains the why behind implementation choices.',
  rules: 'Follows TypeScript strict typing conventions, implements defensive programming practices, writes testable modular code, handles edge cases gracefully, and adheres to established coding standards.\n\n**CRITICAL: Always include error handling and validation for all user inputs and external data sources**',
  async tools() { return await buildPersonaTools('Code'); },
  reasoning: { value: 0.1 },
  slashCommands: []
};

const debugPersonaData = {
  role: 'The meticulous problem solver and debugging expert who systematically identifies, analyzes, and resolves software issues.',
  capabilities: 'Analyzes error logs and stack traces, reproduces bugs systematically, isolates root causes through methodical testing, proposes targeted fixes, and verifies solutions comprehensively.',
  output: 'Provides clear explanations of the bug\'s cause, step-by-step reproduction instructions, detailed analysis of what went wrong, specific code changes needed, and verification steps to confirm the fix.',
  rules: 'Approaches debugging systematically from symptoms to root cause, considers all possible failure modes, validates fixes don\'t introduce regressions, and documents lessons learned for future reference.\n\n**CRITICAL: Always verify that a fix addresses the root cause, not just the symptoms**',
  async tools() { return await buildPersonaTools('Debug'); },
  reasoning: { value: 0.5 },
  slashCommands: []
};

const qaPersonaData = {
  role: 'The rigorous quality assurance specialist who ensures software reliability, performance, and user experience through comprehensive testing.',
  capabilities: 'Designs test cases and scenarios, performs manual and automated testing, identifies usability issues, validates functionality against requirements, and reports defects with detailed evidence.',
  output: 'Delivers thorough test reports with pass/fail metrics, detailed bug descriptions with reproduction steps, performance benchmarks, usability observations, and quality recommendations.',
  rules: 'Tests from multiple user perspectives, considers edge cases and boundary conditions, validates both functional and non-functional requirements, documents all findings comprehensively, and prioritizes issues by impact.\n\n**CRITICAL: Always test with real-world scenarios that reflect actual user behavior**',
  async tools() { return await buildPersonaTools('QA'); },
  reasoning: { value: 0.75 },
  slashCommands: []
};

/**
 * Build a default persona object for seeding (uses prepared statements — safe for apostrophes in copy).
 */
export async function buildDefaultPersonaForUser(
  userId: number,
  personaName: string,
): Promise<Persona> {
  const personaDataMap = {
    Chat: chatPersonaData,
    Orchestrator: orchestratorPersonaData,
    Architect: architectPersonaData,
    Code: codePersonaData,
    Debug: debugPersonaData,
    QA: qaPersonaData,
  } as Record<string, typeof chatPersonaData>;

  const data = personaDataMap[personaName];
  if (!data) {
    throw new Error(`Unknown persona name: ${personaName}`);
  }

  const tools = await data.tools();
  const reasoningValue = data.reasoning.value;
  const reasoning =
    PersonaReasoningOptions.find((opt) => Object.values(opt)[0] === reasoningValue) ??
    PersonaReasoningOptions[2];

  return {
    name: personaName,
    sysMsg: {
      role: data.role,
      capabilities: data.capabilities,
      output: data.output,
      rules: data.rules,
    },
    tools,
    reasoning,
    slashCommands: data.slashCommands ?? [],
  };
}

/**
 * Generate an INSERT statement for a default persona for a specific user.
 * @deprecated Prefer buildDefaultPersonaForUser + insertPersonaForUser (SQL escaping).
 */
export async function getDefaultPersonaInsert(userId: number, personaName: string): Promise<string> {
  const persona = await buildDefaultPersonaForUser(userId, personaName);
  const escape = (s: string) => s.replace(/'/g, "''");
  return `
    INSERT OR REPLACE INTO user_personas (
      userid, name, role, capabilities, output, rules,
      tool_list, reasoning_value, slash_commands, created_at, updated_at
    ) VALUES (
      ${userId}, '${escape(personaName)}',
      '${escape(persona.sysMsg.role)}',
      '${escape(persona.sysMsg.capabilities)}',
      '${escape(persona.sysMsg.output)}',
      '${escape(persona.sysMsg.rules)}',
      '${escape(JSON.stringify(persona.tools))}',
      ${Object.values(persona.reasoning as PersonaReasoning)[0]},
      '${escape(JSON.stringify(persona.slashCommands))}',
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  `;
}

export const PersonaSQLStatementKeys = {
  // Queries
  personas_by_id: 'personas_by_id',
  personas_by_name: 'personas_by_name',
  personas_all: 'personas_all',
  personas_by_reasoning: 'personas_by_reasoning',
  personas_by_reasoning_range: 'personas_by_reasoning_range',

  // Statements
  insert_persona: 'insert_persona',
  update_persona: 'update_persona',
  delete_persona: 'delete_persona',
} as const;

export type PersonaSQLStatementKey = keyof typeof PersonaSQLStatementKeys;

export const createPersonaSQLStatements = (db: Database): Record<PersonaSQLStatementKey, Statement> => {
  return {
    // Query statements
    personas_by_id: db.prepare(`
      SELECT * FROM user_personas WHERE userid = ? AND id = ?
    `),

    personas_by_name: db.prepare(`
      SELECT * FROM user_personas WHERE userid = ? AND name = ?
    `),

    personas_all: db.prepare(`
      SELECT * FROM user_personas WHERE userid = ? ORDER BY name ASC
    `),

    personas_by_reasoning: db.prepare(`
      SELECT * FROM user_personas WHERE reasoning_value = ?
    `),

    personas_by_reasoning_range: db.prepare(`
      SELECT * FROM user_personas WHERE reasoning_value BETWEEN ? AND ?
    `),

    insert_persona: db.prepare(`
      INSERT OR REPLACE INTO user_personas (
        userid, name, role, capabilities, output, rules,
        tool_list, reasoning_value, slash_commands, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `),
    update_persona: db.prepare(`
      UPDATE user_personas SET
        name = ?, role = ?, capabilities = ?, output = ?, rules = ?,
        tool_list = ?, reasoning_value = ?, slash_commands = ?, updated_at = ?
      WHERE id = ? AND userid = ?
    `),
    delete_persona: db.prepare(`DELETE FROM user_personas WHERE id = ? AND userid = ?`)
  };
};

export function getPersonaTools(personaName: string): Promise<string[]> {
  return buildPersonaTools(personaName);
}
