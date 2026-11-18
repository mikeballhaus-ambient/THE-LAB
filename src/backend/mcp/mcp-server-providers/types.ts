import { IMCPServerConfig, IExternalMCPServer, MCPToolResponse } from "@/shared/types";
import { MCPServerLoader } from "../mcp-server-loader";

export interface IMCPProvider {
  mcpServerLoader: MCPServerLoader
  loadServer: (config: IMCPServerConfig) => Promise<void>
  executeToolRequest: (externalServer: IExternalMCPServer, toolName: string, args: unknown) => Promise<MCPToolResponse>
}