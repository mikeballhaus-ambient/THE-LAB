import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { MCPToolInterface, MCPToolManifest } from '../../shared/types'
import externalServerLoader from './mcp-server-loader';;
import { z } from 'zod';
import { MCPToolAdapter } from './utils/mcp-tool-adapter';
import { createDirectoryMcpServer, createDirectoryToolsManifest } from './mcp-servers/directory/create-directory-mcp-server';
import { removeDirectoryMcpServer, removeDirectoryToolsManifest } from './mcp-servers/directory/remove-directory-mcp-server';
import { createFileMcpServer, createFileToolsManifest } from './mcp-servers/file/create-file-mcp-server';
import { listFilesMcpServer, listFilesToolsManifest } from './mcp-servers/file/list-files-mcp-server';
import { readFileMcpServer, readFileToolsManifest } from './mcp-servers/file/read-file-mcp-server';
import { removeFileMcpServer, removeFileToolsManifest } from './mcp-servers/file/remove-file-mcp-server';
import { updateFileMcpServer, updateFileToolsManifest } from './mcp-servers/file/update-file-mcp-server';
import { webFetchMcpServer, webFetchToolsManifest } from './mcp-servers/web/web-fetch-mcp-server';
import { webQueryMcpServer, webQueryToolsManifest } from './mcp-servers/web/web-query-mcp-server';
import { documentorMcpServer, documentorToolsManifest } from './mcp-servers/documentation/documentor-mcp-server';
import { todoListMcpServer, todoListToolsManifest } from './mcp-servers/todo-list/todo-list-mcp-server';
import { personaManagerMcpServer, personaManagerToolsManifest } from './mcp-servers/persona/persona-manager-mcp-server';
import {
  knowledgeBaseMcpServer,
  knowledgeBaseToolsManifest,
} from './mcp-servers/knowledge-base/knowledge-base-mcp-server';
import { context7McpServer, context7ToolsManifest } from './mcp-servers/documentation/context7-mcp-server';
import { appManagementMcpServer, appManagementToolsManifest } from './mcp-servers/apps/app-management-mcp-server';
import { awaiterMcpServer, awaiterToolsManifest } from './mcp-servers/awaiter/awaiter-mcp-server';
import { runTerminalCommandMcpServer, runTerminalCommandToolsManifest } from './mcp-servers/command/run-terminal-command-mcp-server';
import { searchRepositoryMcpServer, searchRepositoryToolsManifest } from './mcp-servers/search/search-repository-mcp-server';
import { followupMcpServer, followupToolsManifest } from './mcp-servers/followup/followup-mcp-server';
import { uiAutomationMcpServer, uiAutomationToolsManifest } from './mcp-servers/ui-automation/ui-automation-mcp-server';
import {
  labIntegrationsMcpServer,
  labIntegrationsToolsManifest,
} from './mcp-servers/lab-integrations/lab-integrations-mcp-server';
import { workflowMcpServer, workflowToolsManifest } from './mcp-servers/workflow/workflow-mcp-server';

class MCPToolRegistry {
  private static instance: MCPToolRegistry;
  private tools: Map<string, MCPToolInterface<z.ZodObject<z.ZodRawShape>>>;
  private lock: boolean = false;

  private constructor() {
    this.tools = new Map<string, MCPToolInterface<z.ZodObject<z.ZodRawShape>>>();
  }

  public static getInstance(): MCPToolRegistry {
    if (!MCPToolRegistry.instance) {
      MCPToolRegistry.instance = new MCPToolRegistry();
    }
    return MCPToolRegistry.instance;
  }

  public async acquireLock(): Promise<void> {
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.lock = true;
  }

  public releaseLock(): void {
    this.lock = false;
  }

  public register(tool: MCPToolInterface<z.ZodObject<z.ZodRawShape>>): void {
    this.tools.set(tool.id, tool);
  }

  public async registerMCPServer(
    server: McpServer,
    toolsManifest: Array<MCPToolManifest>
  ): Promise<void> {

    // 1. Natively create two cross-linked in-memory channel instances
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // 2. Connect your server to its dedicated end of the memory pipe
    await server.connect(serverTransport);

    for (const tool of toolsManifest) {
      this.tools.set(tool.id, new MCPToolAdapter(
        tool.id,
        tool.name,
        tool.description,
        tool.params,
        clientTransport
      ) as unknown as MCPToolInterface<z.ZodObject<z.ZodRawShape>>);
    }
  }


  public getTool<T extends z.ZodObject<z.ZodRawShape>>(id: string, userId: number): MCPToolInterface<T> | null {
    const systemTool = this.tools.get(id) as MCPToolInterface<T>
    const userMCPTools = externalServerLoader.getInstance(userId)
    const userMCPTool = userMCPTools.getToolWrappers().get(id)
    return systemTool ? systemTool as MCPToolInterface<T> : userMCPTool ? userMCPTool as MCPToolInterface<T> : null;
  }

  /**
   * Every tool registered on this server (the built-in MCP servers), without per-user external tools.
   *
   * This is the catalogue that Settings → Personas → Tools must offer: a persona can only be granted a
   * tool that exists here, so anything registered but absent from this list is invisible in the UI even
   * though the agent could run it.
   */
  public getRegisteredTools(): Array<MCPToolInterface<z.ZodObject<z.ZodRawShape>>> {
    return Array.from(this.tools.values());
  }

  // Get all tools for a specific user
  getAllToolsForUser(userId: number): Array<MCPToolInterface<z.ZodObject<z.ZodRawShape>>> {
    const userTools = new Map<string, MCPToolInterface<z.ZodObject<z.ZodRawShape>>>();

    // Collect built-in tools (filtered by userId)
    for (const [id, tool] of this.tools.entries()) {
      userTools.set(id, tool);
    }

    // Collect external server tools from per-user loaders
    const loader = externalServerLoader.getInstance(userId);
    const toolWrappers = loader.getToolWrappers().entries()
    for (const [id, tool] of toolWrappers) {
      userTools.set(id, tool);
    }

    return Array.from(userTools.values());
  }

  public async loadDefaultServers(): Promise<void> {

    const context7Enabled = process.env.VITE_CONTEXT7_BASEURL && process.env.VITE_CONTEXT7_KEY ? true : false
    const webQueryEnabled = process.env.VITE_WEB_QUERY_BASEURL && process.env.VITE_WEB_QUERY_API_KEY ? true : false

    await this.registerMCPServer(createDirectoryMcpServer, createDirectoryToolsManifest);
    await this.registerMCPServer(createFileMcpServer, createFileToolsManifest);
    await this.registerMCPServer(appManagementMcpServer, appManagementToolsManifest);
    await this.registerMCPServer(listFilesMcpServer, listFilesToolsManifest);
    await this.registerMCPServer(readFileMcpServer, readFileToolsManifest);
    await this.registerMCPServer(removeDirectoryMcpServer, removeDirectoryToolsManifest);
    await this.registerMCPServer(removeFileMcpServer, removeFileToolsManifest);
    await this.registerMCPServer(updateFileMcpServer, updateFileToolsManifest);
    await this.registerMCPServer(webFetchMcpServer, webFetchToolsManifest);
    await this.registerMCPServer(todoListMcpServer, todoListToolsManifest);
    await this.registerMCPServer(personaManagerMcpServer, personaManagerToolsManifest);
    // rm-64 §30.8a — the lab's documentation hub, available to every persona.
    await this.registerMCPServer(knowledgeBaseMcpServer, knowledgeBaseToolsManifest);
    await this.registerMCPServer(awaiterMcpServer, awaiterToolsManifest);
    await this.registerMCPServer(runTerminalCommandMcpServer, runTerminalCommandToolsManifest);
    await this.registerMCPServer(documentorMcpServer, documentorToolsManifest);
    await this.registerMCPServer(followupMcpServer, followupToolsManifest);
    await this.registerMCPServer(uiAutomationMcpServer, uiAutomationToolsManifest);
    await this.registerMCPServer(searchRepositoryMcpServer, searchRepositoryToolsManifest);
    await this.registerMCPServer(labIntegrationsMcpServer, labIntegrationsToolsManifest);
    // Workflow Studio authoring/inspection tools. Statically imported like every other built-in
    // server: a lazily-imported registration is one failed module resolution away from silently not
    // existing, and a server that is not registered cannot be granted to any persona.
    await this.registerMCPServer(workflowMcpServer, workflowToolsManifest);

    if (context7Enabled) await this.registerMCPServer(context7McpServer, context7ToolsManifest);
    if (webQueryEnabled) await this.registerMCPServer(webQueryMcpServer, webQueryToolsManifest);
  }
}

export default MCPToolRegistry