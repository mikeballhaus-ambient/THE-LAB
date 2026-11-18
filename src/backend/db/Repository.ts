import { Database } from "better-sqlite3";

export interface IRepository {
  bootstrap: (db: Database) => Promise<void>
  initialize: () => Promise<void>
  close: () => void
}

export abstract class Repository implements IRepository {
  protected db!: Database;
  abstract close(): void
  public async bootstrap(db: Database): Promise<void> {
    if (db) {
      this.db = db;
      await this.initialize()
    }

  }
  abstract initialize(): Promise<void>
}