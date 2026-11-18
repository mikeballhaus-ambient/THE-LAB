import * as path from 'path';
import * as fs from 'fs';

export interface DatabaseConfig {
  path: string;
  journalMode: 'WAL' | 'DELETE' | 'TRUNCATE';
  foreignKeys: boolean;
  synchronous: 'FULL' | 'NORMAL' | 'OFF';
}

export const databaseConfig: DatabaseConfig = {
  path: path.join(process.cwd(), 'db', 'the_lab.db'),
  journalMode: 'WAL',
  foreignKeys: true,
  synchronous: 'FULL',
};

/**
 * Ensure database directory exists
 */
export async function ensureDatabaseDirectory(): Promise<void> {
  const dir = path.dirname(databaseConfig.path);

  try {
    await fs.promises.access(dir);
  } catch {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

/**
 * Get connection string for better-sqlite3
 */
export async function getDatabasePath(): Promise<string> {
  await ensureDatabaseDirectory();
  const fromEnv = process.env.DATABASE_PATH?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return databaseConfig.path;
}
