import {
  Persona,
  PersonaReasoning,
  PersonaReasoningOptions,
} from '../../../shared/types/persona';
import {
  createUserPersonasTable,
  createUserPersonasIndexes,
  PersonaSQLStatementKeys,
  createPersonaSQLStatements,
  PersonaSQLStatementKey,
  buildDefaultPersonaForUser,
} from './persona-schema';
import { mergePersonaUniversalTools } from '@/shared/constants/lab-session-todo-tools';
import type { Statement } from 'better-sqlite3';
import { Repository } from '../Repository';

interface PersonaDbRow {
  id: number;
  userid: number;
  name: string;
  role: string;
  capabilities: string;
  output: string;
  rules: string;
  tool_list: string | null;
  reasoning_value: number;
  slash_commands: string | null;
}

export class PersonaRepository extends Repository {
  private statements = {} as Record<PersonaSQLStatementKey, Statement>;

  close(): void {
    this.statements = {} as Record<PersonaSQLStatementKey, Statement>;
  }

  async initialize(): Promise<void> {
    if (this.db) {
      // Create table and indexes first (required before preparing statements that reference the table)
      this.db.exec(createUserPersonasTable);
      this.db.exec(createUserPersonasIndexes);

      // Now create SQL statements (they reference the table we just created)
      this.statements = createPersonaSQLStatements(this.db);

      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM user_personas').get() as { count: number };
      const count = countResult.count;
      if (count === 0 && typeof count === 'number') {
        // Async initialization: load personas from config file and insert them
        await this.ensureUserHasDefaultPersonas(1);
      }
      await this.syncSeededPersonaToolListsFromConfig();
    }
  }

  /** Refresh built-in persona tool allowlists from persona-tools-config.json (existing DBs). */
  private async syncSeededPersonaToolListsFromConfig(): Promise<void> {
    const builtinNames = ['Chat', 'Orchestrator', 'Architect', 'Code', 'Debug', 'QA'];
    const update = this.db.prepare(
      `UPDATE user_personas SET tool_list = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?`,
    );
    for (const name of builtinNames) {
      const persona = await buildDefaultPersonaForUser(1, name);
      update.run(JSON.stringify(persona.tools), name);
    }
  }


  //
  // CRUD OPERATIONS
  //

  /**
   * Insert a new persona for a specific user into the database
   * @param userId - The user identifier
   * @param persona - The persona object to insert
   */
  insertPersonaForUser(userId: number, persona: Persona): void {
    this.db.transaction(() => {
      this.statements[PersonaSQLStatementKeys.insert_persona].run(
        userId,
        persona.name,
        persona.sysMsg.role,
        persona.sysMsg.capabilities,
        persona.sysMsg.output,
        persona.sysMsg.rules,
        JSON.stringify(persona.tools),
        Object.values(persona.reasoning as PersonaReasoning)[0],
        JSON.stringify(persona.slashCommands)
      );
    })();
  }

  /**
   * Update an existing persona for a specific user
   * @param userId - The user identifier
   * @param id - The persona ID to update
   * @param persona - The updated persona object
   */
  updatePersonaForUser(userId: number, id: number, persona: Persona): void {
    this.db.transaction(() => {
      this.statements[PersonaSQLStatementKeys.update_persona].run(
        persona.name,
        persona.sysMsg.role,
        persona.sysMsg.capabilities,
        persona.sysMsg.output,
        persona.sysMsg.rules,
        JSON.stringify(persona.tools),
        Object.values(persona.reasoning as PersonaReasoning)[0],
        JSON.stringify(persona.slashCommands),
        new Date().toISOString(),
        id,
        userId
      );
    })();
  }

  /**
   * Delete a persona for a specific user
   * @param userId - The user identifier
   * @param id - The persona ID to delete
   */
  deletePersonaForUser(userId: number, id: number): void {
    this.db.transaction(() => {
      this.statements[PersonaSQLStatementKeys.delete_persona].run(id, userId);
    })();
  }

  //
  // QUERY METHODS
  //

  /**
   * Get a persona by its ID for a specific user
   * @param userId - The user identifier
   * @param id - The persona identifier
   * @returns The persona object or undefined if not found
   */
  getPersonaById(userId: number, id: number): Persona | undefined {
    const row = this.statements[PersonaSQLStatementKeys.personas_by_id].get(userId, id) as PersonaDbRow | undefined;
    if (!row) return undefined;
    return this.mapRowToPersona(row);
  }

  /**
   * Get a persona by its name for a specific user
   * @param userId - The user identifier
   * @param name - The persona name
   * @returns The persona object or undefined if not found
   */
  getPersonaByName(userId: number, name: string): Persona | undefined {
    const row = this.statements[PersonaSQLStatementKeys.personas_by_name].get(userId, name) as PersonaDbRow | undefined;
    if (!row) return undefined;
    return this.mapRowToPersona(row);
  }

  /**
   * Get all personas for a specific user
   * @param userId - The user identifier
   * @returns Array of persona objects
   */
  getAllPersonasForUser(userId: number): Persona[] {
    const rows = this.statements[PersonaSQLStatementKeys.personas_all].all(userId) as PersonaDbRow[];
    return rows.map(row => this.mapRowToPersona(row));
  }

  /**
   * Get personas by reasoning value for a specific user
   * @param userId - The user identifier
   * @param reasoningValue - The reasoning value to filter by
   * @returns Array of persona objects
   */
  getPersonasByReasoning(userId: number, reasoningValue: number): Persona[] {
    const rows = this.statements[PersonaSQLStatementKeys.personas_by_reasoning].all(userId, reasoningValue) as PersonaDbRow[];
    return rows.map(row => this.mapRowToPersona(row));
  }

  /**
   * Get personas by reasoning value range for a specific user
   * @param userId - The user identifier
   * @param minReasoning - Minimum reasoning value
   * @param maxReasoning - Maximum reasoning value
   * @returns Array of persona objects
   */
  getPersonasByReasoningRange(userId: number, minReasoning: number, maxReasoning: number): Persona[] {
    const rows = this.statements[PersonaSQLStatementKeys.personas_by_reasoning_range].all(
      userId,
      minReasoning,
      maxReasoning,
    ) as PersonaDbRow[];
    return rows.map(row => this.mapRowToPersona(row));
  }

  /**
   * Get system personas (admin user id=1)
   * @returns Array of persona objects for the admin user
   */
  getSystemPersonas(): Persona[] {
    return this.getAllPersonasForUser(1);
  }

  /**
   * Get personas by reasoning level for a specific user
   * @param userId - The user identifier
   * @param reasoningLevel - The reasoning level (0-4)
   * @returns Array of persona objects
   */
  getPersonasByReasoningLevel(userId: number, reasoningLevel: number): Persona[] {
    return this.getPersonasByReasoning(userId, reasoningLevel);
  }

  /**
   * Get personas by reasoning level range for a specific user
   * @param userId - The user identifier
   * @param min - Minimum reasoning level
   * @param max - Maximum reasoning level
   * @returns Array of persona objects
   */
  getPersonasByReasoningLevelRange(userId: number, min: number, max: number): Persona[] {
    return this.getPersonasByReasoningRange(userId, min, max);
  }

  /**
   * Ensure a user has default system personas if they don't already have any.
   * This is async because it loads tool configurations from the JSON config file.
   * @param userId - The user ID to ensure has default personas
   */
  async ensureUserHasDefaultPersonas(userId: number): Promise<void> {
    const existingPersonas = this.getAllPersonasForUser(userId);
    if (existingPersonas.length > 0) {
      return; // User already has personas
    }

    const defaultPersonas = ['Chat', 'Orchestrator', 'Architect', 'Code', 'Debug', 'QA'];
    
    for (const personaName of defaultPersonas) {
      try {
        const persona = await buildDefaultPersonaForUser(userId, personaName);
        this.insertPersonaForUser(userId, persona);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to insert default persona ${personaName} for user ${userId}:`, errorMessage);
      }
    }
  }

  /**
   * Helper method to deserialize a database row into a Persona object
   * @param row - Raw row from database
   * @returns Persona object with JSON arrays properly deserialized and userId field
   */
  private mapRowToPersona(row: PersonaDbRow): Persona {
    const rawTools = row.tool_list ? (JSON.parse(row.tool_list) as string[]) : [];
    const tools = mergePersonaUniversalTools(rawTools);
    const slashCommands = row.slash_commands ? (JSON.parse(row.slash_commands) as string[]) : [];

    const mappedPersona = {
      id: row.id,
      userId: row.userid,
      name: row.name,
      sysMsg: {
        role: row.role,
        capabilities: row.capabilities,
        output: row.output,
        rules: row.rules
      },
      tools: tools,
      reasoning: Object.fromEntries(PersonaReasoningOptions.map(obj => [Object.values(obj)[0], obj]))[row.reasoning_value],
      slashCommands: slashCommands
    } as Persona;

    return mappedPersona;
  }
}

export const personaRepository = new PersonaRepository();
