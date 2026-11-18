import { mcpStdioAccessRepository } from './mcp-stdio-access-repository';
import { mcpServersService } from '../MCPServers/mcp-servers-service';
import type { McpStdioAccessPayload, McpStdioAccessRequest } from '@/shared/types/mcp-stdio-access';
import type { User } from '@/shared/types/user';

export class McpStdioAccessService {
  private static instance: McpStdioAccessService | null = null;

  private constructor() {}

  public static getInstance(): McpStdioAccessService {
    if (!McpStdioAccessService.instance) {
      McpStdioAccessService.instance = new McpStdioAccessService();
    }
    return McpStdioAccessService.instance;
  }

  isServerAllowlisted(userId: number, serverId: number): boolean {
    return mcpStdioAccessRepository.isAllowlisted(userId, serverId);
  }

  getPayloadForUser(user: User | null | undefined): McpStdioAccessPayload {
    const userId = user?.userId ?? 0;
    if (!userId) {
      return { allowlistedServerIds: [], myRequests: [], pendingForReview: [] };
    }
    const allowlistedServerIds = mcpStdioAccessRepository.allowlistedServerIds(userId);
    const myRequests = mcpStdioAccessRepository.listRequestsForUser(userId);
    const pendingForReview =
      user?.role === 'owner' || user?.role === 'admin'
        ? mcpStdioAccessRepository.listPendingRequestsForReview()
        : [];
    return { allowlistedServerIds, myRequests, pendingForReview };
  }

  requestAccess(userId: number, serverId: number, note?: string): { success: boolean; content: string; request?: McpStdioAccessRequest } {
    const server = mcpServersService.getMCPServerConfig(userId, serverId);
    if (!server) {
      return { success: false, content: 'MCP server not found for this user.' };
    }
    if (server.transport !== 'stdio') {
      return { success: false, content: 'Access requests apply to stdio MCP servers only.' };
    }
    if (mcpStdioAccessRepository.isAllowlisted(userId, serverId)) {
      return { success: false, content: 'You already have stdio access to this server.' };
    }
    if (mcpStdioAccessRepository.hasPendingRequest(userId, serverId)) {
      return { success: false, content: 'A pending request already exists for this server.' };
    }
    const id = mcpStdioAccessRepository.createRequest(userId, serverId, note);
    const request = mcpStdioAccessRepository.getRequestById(id);
    return { success: true, content: 'Stdio access request submitted for admin review.', request };
  }

  reviewRequest(
    reviewer: User | null | undefined,
    requestId: number,
    action: 'approve' | 'deny',
  ): { success: boolean; content: string } {
    if (!reviewer || (reviewer.role !== 'owner' && reviewer.role !== 'admin')) {
      return { success: false, content: 'Only owner/admin can review stdio access requests.' };
    }
    const request = mcpStdioAccessRepository.getRequestById(requestId);
    if (!request) {
      return { success: false, content: 'Request not found.' };
    }
    if (request.status !== 'pending') {
      return { success: false, content: `Request is already ${request.status}.` };
    }
    if (action === 'approve') {
      mcpStdioAccessRepository.setRequestStatus(requestId, 'approved', reviewer.userId);
      mcpStdioAccessRepository.grantAllowlist(request.userId, request.serverId, reviewer.userId);
      return { success: true, content: 'Stdio MCP access approved.' };
    }
    mcpStdioAccessRepository.setRequestStatus(requestId, 'denied', reviewer.userId);
    return { success: true, content: 'Stdio MCP access request denied.' };
  }
}

export const mcpStdioAccessService = McpStdioAccessService.getInstance();
