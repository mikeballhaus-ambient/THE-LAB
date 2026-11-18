import { commandRepository } from './command-repository';
import { ICommand } from '../../../shared/types/command';

export class CommandService {
  private static instance: CommandService | null = null

  private constructor() { }

  public static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService();
    }
    return CommandService.instance;
  }

  //
  // QUERY METHODS
  //

  /**
   * Get command by key, passing to repository for database lookup.
   * @param userId - The user ID to get commands for
   * @param key - The command key to search for
   * @returns The command object or undefined if not found
   */
  getCommandByKey(userId: number, key: string): ICommand | undefined {
    return commandRepository.getCommandByKey(userId, key);
  }

  /**
   * Get all commands for a user, passing to repository for database retrieval.
   * @param userId - The user ID to get commands for
   * @returns Array of all command objects for the user
   */
  getAllCommandsForUser(userId: number): ICommand[] {
    return commandRepository.getAllCommandsForUser(userId);
  }

  /**
   * Get commands by persona, passing to repository for filtered retrieval.
   * @param userId - The user ID to get commands for
   * @param persona - The persona filter to search for
   * @returns Array of commands matching the persona
   */
  getCommandsByPersona(userId: number, persona: string): ICommand[] {
    return commandRepository.getCommandsByPersona(userId, persona);
  }

  //
  // CRUD OPERATIONS
  //

  /**
   * Create a new command in the database, passing to repository for insert.
   * @param userId - The user ID to create the command for
   * @param command - The command object to insert
   */
  createCommandForUser(userId: number, command: ICommand): void {
    commandRepository.insertCommandForUser(userId, command);
  }

  /**
   * Update an existing command in the database, passing to repository for update.
   * @param userId - The user ID of the command owner
   * @param key - The command key
   * @param command - The updated command object
   */
  updateCommandForUser(userId: number, key: string, command: ICommand): void {
    commandRepository.updateCommandForUser(userId, key, command);
  }

  /**
   * Delete a command from the database, passing to repository for delete.
   * @param userId - The user ID of the command owner
   * @param key - The command key
   */
  deleteCommandForUser(userId: number, key: string): void {
    commandRepository.deleteCommandForUser(userId, key);
  }

  /**
   * Get all commands across all users (for admin view).
   * @returns Array of all command objects
   */
  getAllCommands(): ICommand[] {
    return commandRepository.getAllCommands();
  }

  /**
   * Ensure a user has default commands if they don't already have any.
   * @param userId - The user ID to ensure has default commands
   */
  ensureUserHasDefaultCommands(userId: number): void {
    commandRepository.ensureUserHasDefaultCommands(userId);
  }
}

// Singleton instance
export const commandService = CommandService.getInstance();
export default commandService;
