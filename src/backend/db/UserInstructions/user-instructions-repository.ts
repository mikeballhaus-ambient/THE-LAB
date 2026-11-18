import {
  createUserInstructionsTable,
  createUserInstructionsIndex,
  UserInstructionsSQLStatementKeys,
  UserInstructionsSQLStatementKey,
  createUserInstructionsSQLStatements,
  seedDefaultUserInstructions
} from './user-instructions-schema';
import { UserInstruction } from '../../../shared/types';
import type { Statement } from 'better-sqlite3';
import { IRepository, Repository } from '../Repository';

interface UserInstructionDbRow {
  id: number;
  userid: number;
  userId?: number;
  text: string;
}

export class UserInstructionsRepository extends Repository implements IRepository {
  private statements = {} as Record<UserInstructionsSQLStatementKey, Statement>;

  public async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createUserInstructionsTable);
      this.db.exec(createUserInstructionsIndex);
      this.statements = createUserInstructionsSQLStatements(this.db);

      // Check if table is empty and seed if needed
      const countResult = this.db
        .prepare('SELECT COUNT(*) as count FROM user_instructions WHERE userid = ?')
        .get(1) as { count: number };
      const count = countResult.count;
      if (typeof count === 'number' && count === 0) {
        const sql = seedDefaultUserInstructions.replaceAll('{{USERID}}', '1')
        this.db.exec(sql);
      }
    }
  }

  public close(): void {
    this.statements = {} as Record<UserInstructionsSQLStatementKey, Statement>;
  }

  public getUserInstructionsForUser(userId: number): UserInstruction | undefined {
    if (!this.statements) return undefined;
    const statement = this.statements[UserInstructionsSQLStatementKeys.selectByUserId];
    if (!statement) return undefined;

    const results = statement.all(userId) as UserInstructionDbRow[];
    if (results.length == 0) return undefined;

    const row = results[0];

    return {
      id: row.id,
      text: row.text,
      userId: row.userid,
    } as UserInstruction;
  }

  public insertUserInstructionsForUser(userId: number, text: string): void {
    this.db.transaction(() => {
      this.statements[UserInstructionsSQLStatementKeys.insert].run(
        userId,
        text,
        new Date().toISOString(),
        new Date().toISOString()
      );
    })();
  }

  public updateUserInstructionsForUser(userId: number, text: string): void {
    this.db.transaction(() => {
      this.statements[UserInstructionsSQLStatementKeys.update].run(
        text,
        new Date().toISOString(),
        userId
      );
    })();
  }

  public deleteUserInstructionsForUser(userId: number): void {
    this.db.transaction(() => {
      this.statements[UserInstructionsSQLStatementKeys.delete].run(userId);
    })();
  }

  public getAllUserInstructions(): UserInstruction[] {
    if (!this.statements) return [];
    const statement = this.statements[UserInstructionsSQLStatementKeys.selectAll];
    if (!statement) return [];

    const results = statement.all() as UserInstructionDbRow[];
    if (!results) return [];

    return results.map((row) => ({
      userId: row.userid,
      text: row.text
    })) as UserInstruction[];
  }

    public ensureUserHasDefaultUserInstructions(userId: number): void {
      const existingCount = this.statements[UserInstructionsSQLStatementKeys.selectByUserId].get(userId) as
        | { count?: number }
        | undefined;
      if (!existingCount || existingCount.count === 0) {
        // Insert default commands for this user by replacing the placeholder userid (1) with actual userId
        const seedWithUserId = seedDefaultUserInstructions.replaceAll('{{USERID}}', userId.toString());
        this.db.transaction(() => {
          this.db.exec(seedWithUserId);
        })();
      }
    }
  
}

export const userInstructionsRepository = new UserInstructionsRepository();
