import { toolsRepository } from './tools-repository';

import { ToolsList } from '../../../shared/types/mcp-tools';

export class ToolsService {
  private static instance: ToolsService | null = null
  
  private constructor() {
    // Prevent instantiating
  }
  
  public static getInstance(): ToolsService {
    if (!ToolsService.instance) {
      ToolsService.instance = new ToolsService();
    }
    return ToolsService.instance;
  }
  
  // Query methods - delegate to repository
  /**
   * Get all tools, passing to repository for database retrieval.
   * @returns Array of all tool objects
   */
  getAllTools(): ToolsList[] {
    return toolsRepository.getAllTools();
  }
  
  /**
   * Get a tool by id.
   * @param id - The tool identifier
   * @returns The tool object or undefined if not found
   */
  getToolById(id: string): ToolsList | undefined {
    return toolsRepository.getToolById(id);
  }
  
  // CRUD operations - delegate to repository
  /**
   * Add a new tool to the database, passing to repository for insert.
   * @param tool - The tool object to add
   */
  addTool(tool: ToolsList): void {
    toolsRepository.addTool(tool);
  }
  
  /**
   * Update a tool in the database, passing to repository for update.
   * @param tool - The updated tool object
   */
  updateTool(tool: ToolsList): void {
    toolsRepository.updateTool(tool);
  }
  
  /**
   * Remove a tool from the database, passing to repository for delete.
   * @param id - The tool identifier
   */
  removeTool(id: string): void {
    toolsRepository.removeTool(id);
  }

  /**
   * Reconcile the tool catalogue with the MCP tools actually registered on this server.
   *
   * Settings → Personas → Tools lists rows from the `tools` table, not the live registry, so a server
   * whose tools were never added to `seedTools` is invisible there and no persona can be granted it —
   * even though the agent can already call it. Running this after {@link MCPToolRegistry.loadDefaultServers}
   * makes the catalogue authoritative by construction rather than by whoever remembered to edit a seed.
   *
   * Idempotent: existing ids get their name/description refreshed.
   * @returns number of catalogue rows written
   */
  syncRegisteredTools(tools: ToolsList[]): number {
    return toolsRepository.upsertTools(tools);
  }
}

// Singleton instance
export const toolsService = ToolsService.getInstance();

export default toolsService;
