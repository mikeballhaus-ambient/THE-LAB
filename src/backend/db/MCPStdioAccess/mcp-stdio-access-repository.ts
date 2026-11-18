import { Repository } from '../Repository';
import {
  createMcpStdioAccessIndexes,
  createMcpStdioAccessRequestsTable,
  createMcpStdioAllowlistTable,
  createMcpStdioAccessSQLStatements,
  McpStdioAccessSQLStatementKeys,
} from './mcp-stdio-access-schema';
import type { McpStdioAccessRequest } from '@/shared/types/mcp-stdio-access';

export class McpStdioAccessRepository extends Repository {
  private statements: Record<string, { get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[]; run: (...args: unknown[]) => { lastInsertRowid?: number } }> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    this.db.exec(createMcpStdioAllowlistTable);
    this.db.exec(createMcpStdioAccessRequestsTable);
    this.db.exec(createMcpStdioAccessIndexes);
    this.statements = createMcpStdioAccessSQLStatements(
      this.db as Parameters<typeof createMcpStdioAccessSQLStatements>[0],
    ) as typeof this.statements;
  }

  isAllowlisted(userId: number, serverId: number): boolean {
    const row = this.statements[McpStdioAccessSQLStatementKeys.allowlist_has]?.get(userId, serverId);
    return !!row;
  }

  allowlistedServerIds(userId: number): number[] {
    const rows = this.statements[McpStdioAccessSQLStatementKeys.allowlist_server_ids_for_user]?.all(userId) as
      | { server_id: number }[]
      | undefined;
    return (rows ?? []).map((r) => Number(r.server_id));
  }

  grantAllowlist(userId: number, serverId: number, grantedBy: number): void {
    this.statements[McpStdioAccessSQLStatementKeys.insert_allowlist]?.run(userId, serverId, grantedBy);
  }

  listRequestsForUser(userId: number): McpStdioAccessRequest[] {
    const rows = this.statements[McpStdioAccessSQLStatementKeys.requests_by_user]?.all(userId) as Record<string, unknown>[];
    return rows.map(mapRequestRow);
  }

  listPendingRequestsForReview(): McpStdioAccessRequest[] {
    const rows = this.statements[McpStdioAccessSQLStatementKeys.pending_requests_all]?.all() as Record<string, unknown>[];
    return rows.map(mapRequestRow);
  }

  createRequest(userId: number, serverId: number, note?: string): number {
    const result = this.statements[McpStdioAccessSQLStatementKeys.insert_request]?.run(
      userId,
      serverId,
      note ?? null,
    ) as { lastInsertRowid: number };
    return Number(result.lastInsertRowid);
  }

  getRequestById(requestId: number): McpStdioAccessRequest | undefined {
    const row = this.statements[McpStdioAccessSQLStatementKeys.request_by_id]?.get(requestId) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      return undefined;
    }
    return mapRequestRow(row);
  }

  hasPendingRequest(userId: number, serverId: number): boolean {
    const row = this.statements[McpStdioAccessSQLStatementKeys.pending_request_for_user_server]?.get(
      userId,
      serverId,
    );
    return !!row;
  }

  setRequestStatus(requestId: number, status: 'approved' | 'denied', reviewedBy: number): void {
    this.statements[McpStdioAccessSQLStatementKeys.update_request_status]?.run(status, reviewedBy, requestId);
  }
}

function mapRequestRow(row: Record<string, unknown>): McpStdioAccessRequest {
  return {
    id: Number(row.id),
    userId: Number(row.userid),
    serverId: Number(row.server_id),
    status: row.status as McpStdioAccessRequest['status'],
    note: typeof row.note === 'string' ? row.note : undefined,
    serverName: typeof row.server_name === 'string' ? row.server_name : undefined,
    requesterEmail: typeof row.requester_email === 'string' ? row.requester_email : undefined,
    requesterName: typeof row.requester_name === 'string' ? row.requester_name : undefined,
    reviewedBy: row.reviewed_by != null ? Number(row.reviewed_by) : undefined,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
}

export const mcpStdioAccessRepository = new McpStdioAccessRepository();
