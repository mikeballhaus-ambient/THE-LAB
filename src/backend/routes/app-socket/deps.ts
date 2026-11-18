import type { Socket as RawSocket } from 'socket.io';
import type { ProviderService } from '../../ai/provider-service';
import type { ConversationMemory } from '../../chroma/conversation-memory';
import type MCPToolRegistry from '../../mcp/mcp-tool';

/** Shared dependencies for platform socket route modules (rm-46 **4.1**). */
export interface AppSocketRouteContext {
  socket: RawSocket;
  providerService: ProviderService;
  memory: ConversationMemory;
  mcpRegistry: MCPToolRegistry;
}
