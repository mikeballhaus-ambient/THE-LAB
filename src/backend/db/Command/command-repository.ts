import {
  createUserCommandsTable,
  createUserCommandsIndex,
  seedDefaultAdminCommands,
  CommandSQLStatementKeys,
  createCommandsSQLStatements,
  CommandSQLStatementKey
} from './command-schema';
import { ICommand } from '../../../shared/types/command';
import type { ChatPersona } from '../../../shared/types/chat';
import { IRepository, Repository } from '../Repository';

interface CommandDbRow {
  key: string;
  description: string;
  text: string;
  persona: string;
  argument_hints?: string;
  userid: number;
  columns?: number;
}

function mapCommandRow(row: unknown): ICommand {
  const r = row as CommandDbRow;
  return {
    key: r.key,
    description: r.description,
    text: r.text,
    persona: r.persona as ChatPersona & '',
    argumentHints: r.argument_hints ? JSON.parse(r.argument_hints) : [],
    userId: r.userid,
  };
}

export class CommandRepository extends Repository implements IRepository {
  private statements: Partial<Record<CommandSQLStatementKey, unknown>> = {};

  public async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createUserCommandsTable);
      this.db.exec(createUserCommandsIndex);
      this.statements = createCommandsSQLStatements(this.db);

      // Check if table is empty and seed if needed
      const countResult = this.db
        .prepare('SELECT COUNT(*) as count FROM user_commands WHERE userid = ?')
        .get(1);
      const count = (countResult as { count: number }).count;
      if (typeof count === 'number' && count === 0) {
        const sql = seedDefaultAdminCommands.replaceAll('{{USERID}}', '1')
        this.db.exec(sql);
      }
    }
  }

  public close(): void {
    this.statements = {};
  }

  public getCommandByKey(userId: number, key: string): ICommand | undefined {
    if (!this.statements) return undefined;
    const statement = this.statements[CommandSQLStatementKeys.selectByKey];
    if (!statement) return undefined;

    const result = (statement as { get: (key: string, userId: number) => unknown }).get(key, userId);
    if (!result || (result as { columns?: number }).columns === 0) return undefined;

    return mapCommandRow(result);
  }

  public getAllCommandsForUser(userId: number): ICommand[] {
    if (!this.statements) return [];
    const statement = this.statements[CommandSQLStatementKeys.selectByUserId];
    if (!statement) return [];

    const results = (statement as { all: (userId: number) => unknown[] }).all(userId);
    if (!results) return [];

    return results.map((row) => mapCommandRow(row));
  }

  public getCommandsByPersona(userId: number, persona: string): ICommand[] {
    if (!this.statements) return [];
    const statement = this.statements[CommandSQLStatementKeys.selectByPersona];
    if (!statement) return [];

    const results = (statement as { all: (persona: string, userId: number) => unknown[] }).all(persona, userId);
    if (!results) return [];

    return results.map((row) => mapCommandRow(row));
  }

  public insertCommandForUser(userId: number, command: ICommand): void {
    const argHints = command.argumentHints ? JSON.stringify(command.argumentHints) : '[]';

    this.db.transaction(() => {
      (this.statements[CommandSQLStatementKeys.insert] as { run: (...args: unknown[]) => unknown }).run(
        userId,
        command.key,
        command.description,
        command.text,
        command.persona,
        argHints,
        new Date().toISOString(),
        new Date().toISOString()
      );
    })();
  }

  public updateCommandForUser(userId: number, key: string, command: ICommand): void {
    const argHints = command.argumentHints ? JSON.stringify(command.argumentHints) : '[]';

    this.db.transaction(() => {
      (this.statements[CommandSQLStatementKeys.update] as { run: (...args: unknown[]) => unknown }).run(
        command.description,
        command.text,
        command.persona,
        argHints,
        new Date().toISOString(),
        userId,
        key
      );
    })();
  }

  public deleteCommandForUser(userId: number, key: string): void {
    this.db.transaction(() => {
      (this.statements[CommandSQLStatementKeys.delete] as { run: (userId: number, key: string) => unknown }).run(userId, key);
    })();
  }

  /**
   * Ensure a user has default commands if they don't already have any
   * @param userId - The user ID to ensure has default commands
   */
  public ensureUserHasDefaultCommands(userId: number): void {
    const existingCount = (this.statements[CommandSQLStatementKeys.selectByUserId] as { get: (userId: number) => unknown }).get(userId);
    if (!existingCount || (existingCount as { count?: number }).count === 0) {
      // Insert default commands for this user by replacing the placeholder userid (1) with actual userId
      const seedWithUserId = seedDefaultAdminCommands.replaceAll('{{USERID}}', userId.toString());
      this.db.transaction(() => {
        this.db.exec(seedWithUserId);
      })();
    }
  }

  public getAllCommands(): ICommand[] {
    if (!this.statements) return [];
    const statement = this.statements[CommandSQLStatementKeys.selectAll];
    if (!statement) return [];

    const results = (statement as { all: () => unknown[] }).all();
    if (!results) return [];

    return results.map((row) => mapCommandRow(row));
  }
}

export const commandRepository = new CommandRepository();
