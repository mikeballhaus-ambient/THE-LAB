import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import betterSqlite3, { Database } from 'better-sqlite3';
import { mcpStdioAccessRepository } from '@/backend/db/MCPStdioAccess/mcp-stdio-access-repository';
import { mcpServersRepository } from '@/backend/db/MCPServers/mcp-servers-repository';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { createMCPServersTable } from '@/backend/db/MCPServers/mcp-servers-schema';
import { mcpStdioAccessService } from '@/backend/db/MCPStdioAccess/mcp-stdio-access-service';

describe('mcp stdio access service', () => {
  let db: Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.exec(createMCPServersTable);
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role) VALUES (1, 'a@t', 'x', 'Admin', 'admin')`).run();
    db.prepare(`INSERT INTO users (id, email, password_hash, name, role) VALUES (2, 'm@t', 'x', 'Member', 'member')`).run();
    db.prepare(
      `INSERT INTO user_mcp_servers (id, userid, name, command, args, transport, enabled) VALUES (10, 2, 'custom-stdio', 'npx', '[]', 'stdio', 1)`,
    ).run();
    await mcpServersRepository.bootstrap(db);
    await mcpServersRepository.initialize();
    await mcpStdioAccessRepository.bootstrap(db);
    await mcpStdioAccessRepository.initialize();
  });

  afterAll(() => {
    mcpStdioAccessRepository.close();
    mcpServersRepository.close();
    db.close();
  });

  test('request + approve grants allowlist', () => {
    const admin = {
      id: 1,
      userId: 1,
      role: 'admin' as const,
      name: 'Admin',
      email: 'a@t',
      status: 'active' as const,
      lastSeen: '2020-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      permissions: { global: {}, app: [] },
    };
    const member = {
      id: 2,
      userId: 2,
      role: 'member' as const,
      name: 'Member',
      email: 'm@t',
      status: 'active' as const,
      lastSeen: '2020-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      permissions: { global: {}, app: [] },
    };

    const req = mcpStdioAccessService.requestAccess(2, 10, 'need datetime');
    expect(req.success).toBe(true);

    const denyReview = mcpStdioAccessService.reviewRequest(member, req.request!.id, 'approve');
    expect(denyReview.success).toBe(false);

    const approve = mcpStdioAccessService.reviewRequest(admin, req.request!.id, 'approve');
    expect(approve.success).toBe(true);
    expect(mcpStdioAccessService.isServerAllowlisted(2, 10)).toBe(true);
  });
});
