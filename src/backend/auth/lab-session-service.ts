import { randomBytes } from 'crypto';
import type Database from 'better-sqlite3';
import { databaseManager } from '../db/DatabaseManager';
import { UserService } from '../db/Auth/auth-service';
import type { User } from '@/shared/types/user';
import { signLabUserJwt, verifyLabUserJwt } from './lab-jwt';

export const LAB_SESSION_COOKIE = 'lab_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface LabSessionRow {
  id: string;
  userid: number;
  expires_at: string;
}

export class LabSessionService {
  private static instance: LabSessionService | undefined;

  static getInstance(): LabSessionService {
    if (!LabSessionService.instance) {
      LabSessionService.instance = new LabSessionService();
    }
    return LabSessionService.instance;
  }

  private db(connection?: Database.Database): Database.Database {
    return connection ?? databaseManager.getDb();
  }

  /** Pass the same SQLite handle as in-memory regression tests; production uses {@link databaseManager}. */
  bootstrap(connection?: Database.Database): void {
    this.db(connection).exec(`
      CREATE TABLE IF NOT EXISTS lab_sessions (
        id TEXT PRIMARY KEY,
        userid INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_lab_sessions_user ON lab_sessions(userid);
      CREATE INDEX IF NOT EXISTS idx_lab_sessions_expires ON lab_sessions(expires_at);
    `);
  }

  createSession(userId: number): { sessionId: string; accessToken: string; expiresAt: Date } {
    const user = UserService.getInstance().getUserById(userId);
    if (!user || user.status !== 'active') {
      throw new Error('Invalid user for session');
    }
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    this.db()
      .prepare(`INSERT INTO lab_sessions (id, userid, expires_at) VALUES (?, ?, ?)`)
      .run(sessionId, userId, expiresAt.toISOString());
    const email = user.email?.trim() || `user${userId}@lab.local`;
    const accessToken = signLabUserJwt(userId, email, 3600);
    return { sessionId, accessToken, expiresAt };
  }

  revokeSession(sessionId: string): void {
    this.db().prepare(`DELETE FROM lab_sessions WHERE id = ?`).run(sessionId);
  }

  purgeExpired(): void {
    this.db().prepare(`DELETE FROM lab_sessions WHERE expires_at < datetime('now')`).run();
  }

  resolveSession(sessionId: string | undefined | null): User | null {
    if (!sessionId?.trim()) {
      return null;
    }
    this.purgeExpired();
    const row = this.db()
      .prepare(`SELECT id, userid, expires_at FROM lab_sessions WHERE id = ?`)
      .get(sessionId.trim()) as LabSessionRow | undefined;
    if (!row) {
      return null;
    }
    const user = UserService.getInstance().getUserById(Number(row.userid));
    if (!user || user.status !== 'active') {
      return null;
    }
    return user;
  }

  resolveUserFromAccessToken(token: string | null | undefined): User | null {
    if (!token) {
      return null;
    }
    const payload = verifyLabUserJwt(token);
    if (!payload) {
      return null;
    }
    const user = UserService.getInstance().getUserById(payload.sub);
    if (!user || user.status !== 'active') {
      return null;
    }
    return user;
  }
}
