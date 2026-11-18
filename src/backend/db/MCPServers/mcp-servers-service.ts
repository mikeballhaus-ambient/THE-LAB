import { mcpServersRepository } from './mcp-servers-repository';
import { IMCPServerConfig } from '../../../shared/types';

export class MCPServersService {
  private static instance: MCPServersService | null = null;

  private constructor() { }

  public static getInstance(): MCPServersService {
    if (!MCPServersService.instance) {
      MCPServersService.instance = new MCPServersService();
    }
    return MCPServersService.instance;
  }

  getMCPServerConfig(userId: number, id: number): IMCPServerConfig | undefined {
    return mcpServersRepository.get(userId, id);
  }

  getAllMCPServers(userId: number): IMCPServerConfig[] {
    return mcpServersRepository.getAll(userId);
  }

  addMCPServer(mcpsConfig: IMCPServerConfig): number {
    const id = mcpServersRepository.add(mcpsConfig);
    mcpsConfig.id = id;
    return id;
  }

  updateMCPServer(id: number, mcpsConfig: IMCPServerConfig): void {
    mcpServersRepository.update(id, mcpsConfig);
  }

  deleteMCPServer(userId: number, id: number): void {
    mcpServersRepository.delete(userId, id);
  }

  toggleMCPServerEnabled(userId: number, id: number): void {
    mcpServersRepository.toggleEnabled(userId, id);
  }

  update_mcp_server_tools(userId: number, id: number, tools: unknown[]): void {
    mcpServersRepository.update_mcp_server_tools(userId, id, tools)
  }

  /**
   * Ensure a user has default MCP servers if they don't already have any.
   * @param userId - The user ID to ensure has default MCP servers
   */
  ensureUserHasDefaultMCPServers(userId: number): void {
    const existingServers = mcpServersRepository.getAll(userId);
    
    // Check if user already has any MCP servers
    if (existingServers.length > 0) {
      return; // User already has MCP servers, skip seeding
    }

    // Insert default MCP servers for this user using parameterized queries
    mcpServersRepository.insertDefaultMCPServerForUser(userId, 'datetime');
    mcpServersRepository.insertDefaultMCPServerForUser(userId, 'the-lab-db');
    mcpServersRepository.insertDefaultMCPServerForUser(userId, 'neural-memory');
  }
}

// Singleton instance
export const mcpServersService = MCPServersService.getInstance();
export default mcpServersService;
