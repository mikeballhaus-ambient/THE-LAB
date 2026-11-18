import { IExternalMCPServer, IMCPServerConfig, MCPToolResponse } from "@/shared/types";
import { IMCPProvider } from "./types";
import { MCPServerLoader } from "../mcp-server-loader";
import { ProviderService } from "@/backend/ai/provider-service";
import type { SpawnOptions } from 'child_process';

interface JsonRpcResponse {
  id?: number | string;
  result?: {
    content?: unknown;
    isError?: boolean;
    serverInfo?: unknown;
    tools?: unknown[];
  };
  error?: { message?: string } | unknown;
}

function isJsonRpcResponse(value: JsonRpcResponse | Error | null): value is JsonRpcResponse {
  return value !== null && !(value instanceof Error);
}

/**
 * Dynamic import for child_process (Node.js only)
 */
let childProcessModule: Promise<typeof import('child_process')>;

if (typeof window === 'undefined') {
  childProcessModule = import('child_process');
} else {
  childProcessModule = Promise.resolve({} as typeof import('child_process'));
}

const { spawn: serverSpawn } = await childProcessModule;

export class StdioProvider implements IMCPProvider {

  mcpServerLoader: MCPServerLoader
  providerService: ProviderService
  userId: number

  constructor(mcpServerLoader: MCPServerLoader, userId: number) {
    this.mcpServerLoader = mcpServerLoader
    this.providerService = ProviderService.getInstance()
    this.userId = userId
  }

  async executeToolRequest(externalServer: IExternalMCPServer, toolName: string, args: unknown): Promise<MCPToolResponse> {
    const toolArgs =
      typeof args === 'object' && args !== null && !Array.isArray(args)
        ? (args as Record<string, unknown>)
        : {};
    const response = await this.sendRequest(externalServer, {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArgs
      }
    })
    if (isJsonRpcResponse(response) && response.result?.content) {
      const isError = Boolean(response.result.isError);
      const rawContent = response.result.content;
      let text: string;
      if (typeof rawContent === 'string') {
        text = rawContent;
      } else if (Array.isArray(rawContent)) {
        const first = rawContent[0] as { type?: string; text?: string } | undefined;
        text =
          first?.type === 'text' && typeof first.text === 'string'
            ? first.text
            : JSON.stringify(rawContent);
      } else {
        text = JSON.stringify(rawContent);
      }
      return {
        type: 'tool_result',
        tool_call_id: toolName,
        function: 'execute',
        content: text,
        success: !isError,
      } as MCPToolResponse;
    }
    if (isJsonRpcResponse(response) && response.error) {
      const errText =
        typeof response.error === 'object' && response.error !== null && 'message' in response.error
          ? String((response.error as { message?: string }).message)
          : JSON.stringify(response.error);
      return {
        type: 'tool_result',
        tool_call_id: toolName,
        function: 'execute',
        content: `MCP error: ${errText}`,
        success: false,
      } as MCPToolResponse;
    }
    return {
      type: 'tool_result',
      tool_call_id: toolName,
      function: 'execute',
      content: `Unknow MCP error: ${response ? JSON.stringify(response) : ''}`,
      success: false,
    } as MCPToolResponse;
  }

  async loadServer(config: IMCPServerConfig): Promise<void> {

    const externalServer: IExternalMCPServer = {
      config
    };

    // Build spawn options with cwd and env support
    const spawnOptions: SpawnOptions = {
      shell: process.platform === 'win32',
      // For MCP stdio transport, we need to pipe all stdio for proper protocol communication
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    if (config.cwd) {
      spawnOptions.cwd = config.cwd;
    }

    spawnOptions.cwd = config.cwd ? config.cwd : process.cwd()

    if (config.env) {
      spawnOptions.env = { ...process.env, ...config.env };
    } else {
      spawnOptions.env = process.env;
    }

    // Validate command is provided for stdio transport
    if (!config.command) {
      throw new Error('Command is required for stdio transport');
    }

    externalServer.process = serverSpawn(config.command, config.args || [], spawnOptions);

    // CRITICAL FIX: Ensure stdout/stderr are properly piped (stdin may be inherited for sending commands)
    if (!externalServer.process.stdout || !externalServer.process.stderr) {
      throw new Error('Failed to create stdio pipes for MCP server');
    }

    this.mcpServerLoader.getServers().set(config.id, externalServer);

    externalServer.process.on('close', (code, signal) => {
      console.log(
        `[MCP ${config.name}] stdio process closed (code=${code ?? 'null'}, signal=${signal ?? 'none'})`
      );
      const hadTools = Array.from(this.mcpServerLoader.getToolWrappers().values()).some(
        (w) => w.serverId === config.id
      );
      this.mcpServerLoader.getServers().delete(config.id);
      if (config.enabled && !hadTools) {
        void this.mcpServerLoader.reportConnectionFailure(
          config,
          `Process exited (code=${code ?? 'null'}, signal=${signal ?? 'none'})`
        );
      }
    });

    externalServer.process.on('error', (err: Error) => {
      console.error(`[MCP ${config.name}] stdio process error:`, err.message);
    });

    await this.bootstrapOnce(externalServer);
  }

  private async bootstrapOnce(externalServer: IExternalMCPServer): Promise<void> {
    if (!externalServer.process?.stdin || !externalServer.process.stdout) {
      return;
    }

    const initializedResponse = await this.sendRequest(externalServer, {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'THE-LAB', version: '1.0.0' },
      },
    });

    if (isJsonRpcResponse(initializedResponse) && initializedResponse.result?.serverInfo) {
      await this.requestToolsList(externalServer);
    } else {
      const message =
        initializedResponse instanceof Error
          ? initializedResponse.message
          : 'MCP initialize did not return serverInfo';
      console.warn(`[MCP ${externalServer.config.name}] initialize failed: ${message}`);
      await this.mcpServerLoader.reportConnectionFailure(externalServer.config, message);
    }
  }

  private async requestToolsList(externalServer: IExternalMCPServer): Promise<void> {
    const toolsListResponse = await this.sendRequest(externalServer, {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method: 'tools/list',
      params: {}
    })
    if (isJsonRpcResponse(toolsListResponse) && toolsListResponse.result?.tools) {
      await this.mcpServerLoader.extractAndRegisterTools(externalServer, toolsListResponse.result.tools || []);
    } else {
      const message =
        toolsListResponse instanceof Error
          ? toolsListResponse.message
          : 'tools/list returned no tools';
      await this.mcpServerLoader.reportConnectionFailure(externalServer.config, message);
    }
  }

  private async sendRequest(
    externalServer: IExternalMCPServer,
    request: Record<string, unknown>,
  ): Promise<JsonRpcResponse | Error | null> {
    if (!externalServer) {
      console.error(`[MCP Cannot send initialize: server not found`);
      return null;
    }

    // 1. Validate and destructure the streams into local constants
    const { process } = externalServer;
    if (!process || !process.stdin || !process.stdout) {
      throw new Error('Server process streams are not available');
    }

    // Capturing these as local constants fixes the TS(18048) and TS(18047) compiler blocks
    const stdin = process.stdin;
    const stdout = process.stdout;

    return new Promise((resolve) => {
      let responseBuffer = '';

      const onDataHandler = (data: Buffer) => {
        responseBuffer += data.toString();

        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);

            if (parsed && parsed.id == request.id) {
              cleanUp();
              resolve(parsed as JsonRpcResponse);
              return;
            }
          } catch {
            // Keep scanning lines
          }
        }
      };

      const cleanUp = () => {
        clearTimeout(timeoutId);
        stdout.off('data', onDataHandler);
      };

      const timeoutId = setTimeout(() => {
        cleanUp();
        try {
          resolve(new Error(`Request timeout for request ID: ${request.id}`));
        } catch {
          // write to console
        }
      }, 90000);

      stdout.on('data', onDataHandler);

      const input = JSON.stringify(request) + '\n';
      try {
        stdin.write(input, (err) => {
          if (err) {
            cleanUp();
            resolve(err);
          }
        });
      } catch {
        clearTimeout(timeoutId);
        console.log(`process stream was destroyed, unable to write`)
        this.mcpServerLoader.getServers().delete(externalServer.config.id)
      }
    });
  }
}

export const stdioProvider = StdioProvider
export default stdioProvider