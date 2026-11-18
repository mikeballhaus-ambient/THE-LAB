import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { platformAuditRepository } from '@/backend/db/PlatformAudit/platform-audit-repository';
import { platformAuditService } from '@/backend/db/PlatformAudit/platform-audit-service';

describe('platform audit log (5.5)', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    await platformAuditRepository.bootstrap(db);
  });

  afterAll(() => {
    platformAuditRepository.close();
    db.close();
  });

  test('records user admin action', () => {
    platformAuditService.record({
      actorUserId: 1,
      category: 'user',
      action: 'role_change',
      targetType: 'user',
      targetId: '2',
      details: { role: 'admin' },
    });
    const rows = platformAuditService.listRecent(5);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.category).toBe('user');
    expect(rows[0]?.action).toBe('role_change');
  });
});
