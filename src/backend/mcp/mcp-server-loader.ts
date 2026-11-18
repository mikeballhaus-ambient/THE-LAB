
import { IMCPServerConfig, IExternalMCPServer, MCPToolInterface, SOCKET_EVENTS, MCPServerUpdateEventData, ToolsList, SocketErrorEvent, MCPToolResponse } from '../../shared/types';
import { z } from 'zod';
import { ProviderService } from '../ai/provider-service';
import { StdioProvider } from './mcp-server-providers/stdio-provider';
import { StreamableHTTPProvider } from './mcp-server-providers/streamable-http-provider';
import { IMCPProvider } from './mcp-server-providers/types';
import mcpServersService from '../db/MCPServers/mcp-servers-service';
import toolsService from '../db/Tools/tools-service';
import {
  clearMcpConnectionError,
  clearMcpConnectionErrorsForUser,
  getMcpConnectionError,
  mcpBackgroundConnectInFlight,
  setMcpConnectionError,
} from './mcp-connection-state';

// Per-user loader - each userId gets its own instance
export class MCPServerLoader {
  private userId: number
  private servers: Map<number, IExternalMCPServer> = new Map();
  private toolWrappers: Map<string, MCPToolInterface<z.ZodObject<z.ZodRawShape>>> = new Map();  // Tool ID -> wrapper
  private providerService: ProviderService
  private stdioProvider: IMCPProvider
  private streamableHTTPProvider: IMCPProvider

  constructor(userId: number) {
    this.providerService = ProviderService.getInstance()
    this.stdioProvider = new StdioProvider(this, userId)
    this.streamableHTTPProvider = new StreamableHTTPProvider(this, userId)
    this.userId = userId
  }

  private static mcpUserLoaders: Map<number, MCPServerLoader>;

  static getInstance(userId: number): MCPServerLoader {
    if (!MCPServerLoader.mcpUserLoaders) {
      MCPServerLoader.mcpUserLoaders = new Map();
    }
    const cache = MCPServerLoader.mcpUserLoaders;
    let loader = cache.get(userId);
    if (!loader) {
      loader = new MCPServerLoader(userId);
      cache.set(userId, loader);
    }
    return loader;
  }

  static cleanupUser(userId: number): void {
    const cache = MCPServerLoader.mcpUserLoaders;
    if (!cache) return;

    const loader = cache.get(userId);
    if (!loader) return;

    // Kill all server processes for this user
    for (const server of loader.servers.values()) {
      if (server.process) {
        server.process.kill();
      }
    }

    // Clear tool wrappers for this user
    loader.toolWrappers.clear();

    clearMcpConnectionErrorsForUser(userId);

    // Remove from cache
    cache.delete(userId);
  }

  async reportConnectionFailure(config: IMCPServerConfig, errorMessage: string): Promise<void> {
    if (!config.enabled) {
      return;
    }
    setMcpConnectionError(this.userId, config.id, errorMessage);
    mcpServersService.update_mcp_server_tools(this.userId, config.id, []);
    const resolvedTools = MCPServerLoader.resolveAllToolsForUI(this.userId);
    await this.providerService.dispatchUIResponse(
      SOCKET_EVENTS.UPDATE_MCP_SERVER,
      resolvedTools as MCPServerUpdateEventData
    );
  }

  static enrichServersForUI(userId: number, servers: IMCPServerConfig[]): IMCPServerConfig[] {
    const loader = MCPServerLoader.mcpUserLoaders?.get(userId);
    const connecting = mcpBackgroundConnectInFlight.has(userId);

    return servers.map((server) => {
      if (!server.enabled) {
        return { ...server, isConnected: false, connectionError: undefined };
      }

      const registeredCount = loader
        ? Array.from(loader.getToolWrappers().values()).filter((w) => w.serverId === server.id).length
        : 0;
      const isConnected = registeredCount > 0;

      if (isConnected) {
        return { ...server, isConnected: true, connectionError: undefined };
      }

      const storedError = getMcpConnectionError(userId, server.id);
      let connectionError: string;
      if (storedError) {
        connectionError = storedError;
      } else if (connecting) {
        connectionError = 'Connecting…';
      } else {
        connectionError = 'Not connected';
      }

      return { ...server, isConnected: false, connectionError };
    });
  }

  getToolWrappers() {
    return this.toolWrappers
  }

  getServers() {
    return this.servers
  }

  async loadServer(config: IMCPServerConfig): Promise<void> {

    const existing = this.servers.get(config.id);
    const hasRegisteredTools = Array.from(this.toolWrappers.values()).some(
      (w) => w.serverId === config.id
    );
    if (existing && hasRegisteredTools) {
      return;
    }

    try {
      switch (config.transport) {
        case 'stdio':
          {
            await this.stdioProvider.loadServer(config)
            break;
          }
        case 'streamable-http':
          {
            await this.streamableHTTPProvider.loadServer(config)
            break;
          }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[MCP ${config.name}] loadServer failed: ${message}`);
      await this.reportConnectionFailure(config, message);
    }
  }

  static resolveAllToolsForUI(userId: number): MCPServerUpdateEventData {
    const updatedServers = mcpServersService.getAllMCPServers(userId);
    const enrichedServers = MCPServerLoader.enrichServersForUI(userId, updatedServers);
    const internalTools = toolsService.getAllTools().map(
      (tool): ToolsList => ({
        id: tool.id,
        name: tool.name,
        // Never ship `undefined` here: the persona Tools list renders this and reads `.description`
        // unconditionally.
        description: tool.description || '',
        display: tool.display || tool.name || tool.id,
      }),
    );
    const mcpServersResolved = enrichedServers
      .filter((s) => s.isConnected && s.tools && s.tools.length > 0)
      .flatMap(_ => {
        // Fallback to an empty array so TypeScript knows this ALWAYS returns ToolsList[]
        return (_.tools ?? []).map(__ => ({
          id: __.id,
          name: __.name,
          description: __.description,
          display: __.display,
          serverId: __.serverId,
          serverName: __.serverName,
          isExternal: true
        } as ToolsList));
      });

    // This will now compile flawlessly
    const allTools = mcpServersResolved.length > 0
      ? internalTools.concat(mcpServersResolved)
      : internalTools;

    return {
      mcpServersUpdate: enrichedServers,
      tools: allTools
    } as MCPServerUpdateEventData
  }

  async extractAndRegisterTools(externalServer: IExternalMCPServer, tools: unknown[]): Promise<void> {
    for (const tool of tools) {
      try {
        if (typeof tool !== 'object' || tool === null || !('name' in tool)) {
          continue;
        }
        const toolDef = tool as { name: string; description?: string; inputSchema?: unknown };
        if (!this.toolWrappers.get(toolDef.name)) {
          const wrapper = this.createToolWrapper(toolDef, externalServer);

          if (wrapper) this.toolWrappers.set(wrapper.id, wrapper);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const toolId =
          typeof tool === 'object' && tool !== null && 'name' in tool
            ? String((tool as { name?: string }).name)
            : 'unknown';
        await this.providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
          message: `Failed to update MCP server [${externalServer.config.name} - ${toolId}]: ${message}`
        } as SocketErrorEvent);
      }
    }

    const toolWrappers = Array.from(this.toolWrappers.values()).filter(_ => _.serverId == externalServer.config.id)

    if (toolWrappers && toolWrappers.length > 0) {
      clearMcpConnectionError(this.userId, externalServer.config.id);
      mcpServersService.update_mcp_server_tools(this.userId, externalServer.config.id, toolWrappers);
      const resolvedTools = MCPServerLoader.resolveAllToolsForUI(this.userId);

      await this.providerService.dispatchUIResponse(SOCKET_EVENTS.UPDATE_MCP_SERVER, resolvedTools as MCPServerUpdateEventData);
    } else {
      await this.reportConnectionFailure(externalServer.config, 'tools/list returned no tools');
    }
  }

  private createToolWrapper(
    tool: { name: string; description?: string; inputSchema?: unknown },
    externalServer: IExternalMCPServer,
  ): MCPToolInterface<z.ZodObject<z.ZodRawShape>> | null {
    // Parse the inputSchema from external server's tool definition
    const parsed = this.parseInputSchema(tool.inputSchema);
    if (!parsed || !(parsed instanceof z.ZodObject)) return null;
    const schema = parsed as z.ZodObject<z.ZodRawShape>;

    // Create wrapper class dynamically
    class WrapperClass implements MCPToolInterface<z.ZodObject<z.ZodRawShape>> {
      id = tool.name;
      name = tool.name;
      description = tool.description || '';
      params = schema;
      isExternal: boolean | undefined;
      serverId?: number | undefined;
      serverName?: string | undefined;
      display?: string | undefined;

      constructor(private readonly parentLoader: MCPServerLoader) {
        this.isExternal = true;
        this.serverId = externalServer.config.id;
        this.serverName = externalServer.config.name;
        this.display = `${externalServer.config.name}: ${tool.name}`;
      }

      async execute(params: z.infer<typeof this.params>): Promise<MCPToolResponse> {
        try {
          return await this.callExternalTool(externalServer.config.id, tool.name, params);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          throw new Error(`External tool execution failed: ${errorMsg}`);
        }
      }

      private async callExternalTool(
        serverId: number,
        toolName: string,
        args: Record<string, unknown>,
      ): Promise<MCPToolResponse> {
        const server = this.parentLoader.servers.get(serverId);
        if (!server) {
          return {
            type: 'tool_result',
            tool_call_id: toolName,
            function: 'execute',
            content: `MCP server not found for tool: ${toolName}`,
            success: false,
          } as MCPToolResponse;
        }
        switch (server.config.transport) {
          case 'stdio': {
            return await this.parentLoader.stdioProvider.executeToolRequest(server, toolName, args);
          }
          case 'streamable-http': {
            const result = await this.parentLoader.streamableHTTPProvider.executeToolRequest(server, toolName, args);
            if (typeof result === 'string') {
              return {
                type: 'tool_result',
                tool_call_id: toolName,
                function: 'execute',
                content: result,
                success: false,
              } as MCPToolResponse;
            }
            return result;
          }
          default: {
            return {
              type: 'tool_result',
              tool_call_id: toolName,
              function: 'execute',
              content: `MCP server transport not supported: ${server.config.transport}`,
              success: false,
            } as MCPToolResponse;
          }
        }
      }
    }

    return new WrapperClass(this);
  }

  private parseInputSchema(schema: unknown): z.ZodTypeAny | null {
    if (!schema || typeof schema !== 'object' || !('type' in schema)) return null;
    const schemaRecord = schema as Record<string, unknown>;
    if (typeof schemaRecord.type !== 'string') return null;

    const withDescription = (zodType: z.ZodTypeAny): z.ZodTypeAny => {
      if (typeof schemaRecord.description === 'string' && schemaRecord.description.trim()) {
        return zodType.describe(schemaRecord.description);
      }
      return zodType;
    };

    // Handle simple types
    if (schemaRecord.type === 'string') return withDescription(z.string());
    if (schemaRecord.type === 'number') return withDescription(z.number());
    if (schemaRecord.type === 'boolean') return withDescription(z.boolean());

    // Handle object type with properties
    if (schemaRecord.type === 'object' && schemaRecord.properties && typeof schemaRecord.properties === 'object') {
      const props: Record<string, z.ZodTypeAny> = {};
      const requiredKeys = new Set<string>(
        Array.isArray(schemaRecord.required)
          ? schemaRecord.required.filter((k: unknown) => typeof k === 'string')
          : [],
      );
      for (const [key, value] of Object.entries(schemaRecord.properties as Record<string, unknown>)) {
        const parsedField = this.parseInputSchema(value);
        if (!parsedField) {
          continue;
        }
        props[key] = requiredKeys.has(key) ? parsedField : parsedField.optional();
      }
      let objectSchema = z.object(props);
      if (typeof schemaRecord.description === 'string' && schemaRecord.description.trim()) {
        objectSchema = objectSchema.describe(schemaRecord.description);
      }
      return objectSchema;
    }

    // Handle array type
    if (schemaRecord.type === 'array' && schemaRecord.items) {
      const item = this.parseInputSchema(schemaRecord.items);
      if (!item) {
        return null;
      }
      return withDescription(z.array(item));
    }

    return null;
  }

  async unloadServer(serverId: number): Promise<void> {
    const server = this.servers.get(serverId);
    if (server && server.process) {
      server.process.kill();
    }
    if (server && server.httpClient) {
      // Close axios instance
    }
    
    // Remove tool wrappers for this server
    const toolWrappersToRemove = Array.from(this.toolWrappers.values()).filter(wrapper => wrapper.serverId === serverId);
    toolWrappersToRemove.forEach(wrapper => this.toolWrappers.delete(wrapper.id));
    
    this.servers.delete(serverId);
  }
}

export const mcpServerLoader = MCPServerLoader;
export default mcpServerLoader;
