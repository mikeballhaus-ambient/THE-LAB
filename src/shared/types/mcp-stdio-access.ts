export type McpStdioAccessRequestStatus = 'pending' | 'approved' | 'denied';

export interface McpStdioAccessRequest {
  id: number;
  userId: number;
  serverId: number;
  status: McpStdioAccessRequestStatus;
  note?: string;
  serverName?: string;
  requesterEmail?: string;
  requesterName?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
}

export interface McpStdioAccessPayload {
  allowlistedServerIds: number[];
  myRequests: McpStdioAccessRequest[];
  pendingForReview: McpStdioAccessRequest[];
}
