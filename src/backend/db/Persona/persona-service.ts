import { personaRepository } from './persona-repository';
import { Persona } from '../../../shared/types/persona';

export class PersonaService {
  private static instance: PersonaService | null = null;

  private constructor() { }

  public static getInstance(): PersonaService {
    if (!PersonaService.instance) {
      PersonaService.instance = new PersonaService();
    }
    return PersonaService.instance;
  }

  //
  // QUERY METHODS
  //

  /**
   * Get persona by ID for a specific user, passing to repository for database lookup.
   * @param userId - The user identifier
   * @param id - The persona identifier
   * @returns The persona object or undefined if not found
   */
  getPersonaById(userId: number, id: number): Persona | undefined {
    return personaRepository.getPersonaById(userId, id);
  }

  /**
   * Get persona by name for a specific user, passing to repository for database lookup.
   * @param userId - The user identifier
   * @param name - The persona name to search for
   * @returns The persona object or undefined if not found
   */
  getPersonaByName(userId: number, name: string): Persona | undefined {
    return personaRepository.getPersonaByName(userId, name);
  }

  /**
   * Get all personas for a specific user, passing to repository for database retrieval.
   * @param userId - The user identifier
   * @returns Array of persona objects for the user
   */
  getAllPersonasForUser(userId: number): Persona[] {
    return personaRepository.getAllPersonasForUser(userId);
  }

  /**
   * Get shared system personas (no userId filter - shared across all users).
   * @returns Array of default system persona objects
   */
  getSystemPersonas(): Persona[] {
    return personaRepository.getSystemPersonas();
  }

  /**
   * Get personas by reasoning level for a specific user, passing to repository for filtered retrieval.
   * @param userId - The user identifier
   * @param reasoningValue - The reasoning level value to match
   * @returns Array of personas matching the reasoning level
   */
  getPersonasByReasoningLevel(userId: number, reasoningValue: number): Persona[] {
    return personaRepository.getPersonasByReasoningLevel(userId, reasoningValue);
  }

  /**
   * Get personas by reasoning level range for a specific user, passing to repository for filtered retrieval.
   * @param userId - The user identifier
   * @param min - The minimum reasoning level
   * @param max - The maximum reasoning level
   * @returns Array of personas within the reasoning level range
   */
  getPersonasByReasoningLevelRange(userId: number, min: number, max: number): Persona[] {
    return personaRepository.getPersonasByReasoningLevelRange(userId, min, max);
  }

  //
  // CRUD OPERATIONS
  //

  /**
   * Create a new persona for a specific user in the database, passing to repository for insert.
   * @param userId - The user identifier
   * @param persona - The persona object to insert
   */
  createPersonaForUser(userId: number, persona: Persona): void {
    personaRepository.insertPersonaForUser(userId, persona);
  }

  /**
   * Update an existing persona for a specific user in the database, passing to repository for update.
   * @param userId - The user identifier
   * @param personaId - The persona identifier
   * @param persona - The updated persona object
   */
  updatePersonaForUser(userId: number, personaId: number, persona: Persona): void {
    personaRepository.updatePersonaForUser(userId, personaId, persona);
  }

  /**
   * Delete a persona for a specific user from the database, passing to repository for delete.
   * @param userId - The user identifier
   * @param personaId - The persona identifier
   */
  deletePersonaForUser(userId: number, personaId: number): void {
    personaRepository.deletePersonaForUser(userId, personaId);
  }

  /**
   * Ensure a user has default system personas if they don't already have any.
   * This is async because it loads tool configurations from the JSON config file.
   * @param userId - The user ID to ensure has default personas
   */
  async ensureUserHasDefaultPersonas(userId: number): Promise<void> {
    await personaRepository.ensureUserHasDefaultPersonas(userId);
  }
}

// Singleton instance
export const personaService = PersonaService.getInstance();
export default personaService;
