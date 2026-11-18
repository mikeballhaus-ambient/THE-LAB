import { IExternalMCPServer, IMCPServerConfig, MCPToolResponse } from "@/shared/types";
import { IMCPProvider } from "./types";
import { MCPServerLoader } from "../mcp-server-loader";
import axios, { type AxiosRequestConfig } from 'axios';
import { ProviderService } from "@/backend/ai/provider-service";

interface JsonRpcResponse {
  result?: {
    content?: unknown;
    tools?: unknown[];
  };
}

export class StreamableHTTPProvider implements IMCPProvider {

  mcpServerLoader: MCPServerLoader
  providerService: ProviderService
  userId: number

  constructor(mcpServerLoader: MCPServerLoader, userId: number) {
    this.mcpServerLoader = mcpServerLoader
    this.providerService = ProviderService.getInstance()
    this.userId = userId
  }

  async executeToolRequest(
    externalServer: IExternalMCPServer,
    toolName: string,
    args: unknown,
  ): Promise<MCPToolResponse> {
    const toolArgs =
      typeof args === 'object' && args !== null && !Array.isArray(args)
        ? (args as Record<string, unknown>)
        : {};
    try {
      const responseData = await this.sendHttpRequest(externalServer.config.id,
        'tools/call',
        {
          name: toolName,
          arguments: toolArgs,
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": {
              name: "my-client",
              version: "1.0.0"
            }
          }
        },
        {
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/call',
          'Mcp-Name': toolName
        });

      if (responseData && responseData?.result && responseData?.result.content) {
        return {
          type: 'tool_result',
          tool_call_id: toolName,
          function: 'execute',
          content: JSON.stringify(responseData.result.content),
          success: true
        } as MCPToolResponse;
      } else {
        return {
          type: 'tool_result',
          tool_call_id: toolName,
          function: 'execute',
          content: `Unknow MCP error: ${responseData ? JSON.stringify(responseData) : ''}`,
          success: false
        } as MCPToolResponse;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[MCP ${externalServer.config.id}] Failed to list tools:`, message);
      return {
        type: 'tool_result',
        tool_call_id: toolName,
        function: 'execute',
        content: message,
        success: false,
      } as MCPToolResponse;
    }
  }

  async loadServer(config: IMCPServerConfig): Promise<void> {

    const serverId = config.id;
    const externalServer: IExternalMCPServer = {
      config
    };

    const axiosOptions: AxiosRequestConfig = {
      baseURL: config.url,
      timeout: (config.timeout || 30) * 1000,
      headers: {},
    };

    externalServer.httpClient = axios.create(axiosOptions);

    try {
      if (config.url) {
        this.mcpServerLoader.getServers().set(serverId, externalServer);

        let connectionValid = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!connectionValid && attempts < maxAttempts) {
          const toolResponseData = await this.requestToolsList(externalServer, { suppressFailureBroadcast: true });
          if (toolResponseData?.result?.tools) {
            connectionValid = true;
            await this.mcpServerLoader.extractAndRegisterTools(externalServer, toolResponseData.result.tools);
            break;
          }
          attempts++;
          if (attempts < maxAttempts) {
            const delayMs = Math.min(1500 * attempts, 6000);
            console.info(
              `[MCP ${config.name}] tools/list not ready (attempt ${attempts}/${maxAttempts}); retry in ${delayMs}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        if (!connectionValid) {
          const msg = `Could not reach MCP endpoint after ${maxAttempts} attempts (${config.url ?? 'no url'})`;
          console.warn(
            `[MCP ${config.name}] ${msg} — check the server URL or disable this server in Settings if unused`
          );
          this.mcpServerLoader.getServers().delete(serverId);
          await this.mcpServerLoader.reportConnectionFailure(config, msg);
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[MCP ${config.name}] loadServer error: ${errorMsg}`);
      await this.mcpServerLoader.reportConnectionFailure(config, errorMsg);
    }
  }

  private async requestToolsList(
    externalServer: IExternalMCPServer,
    options?: { suppressFailureBroadcast?: boolean }
  ): Promise<JsonRpcResponse | null> {
    try {
      const responseData = await this.sendHttpRequest(
        externalServer.config.id,
        'tools/list',
        {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": {
              name: "my-client",
              version: "1.0.0"
            }
          }
        },
        {
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/list',
        },
        options
      );
      return responseData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[MCP ${externalServer.config.id}] Failed to list tools:`, message);
      if (!options?.suppressFailureBroadcast) {
        await this.mcpServerLoader.reportConnectionFailure(externalServer.config, message);
      }
      return null;
    }
  }

  private async sendHttpRequest(
    serverId: number,
    method: string,
    params: Record<string, unknown>,
    headers: Record<string, string>,
    options?: { suppressFailureBroadcast?: boolean }
  ): Promise<JsonRpcResponse | null> {
    const server = this.mcpServerLoader.getServers().get(serverId);
    if (!server || !server.httpClient) {
      throw new Error('HTTP client not available');
    }

    const requestBody = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method: method,
      params: params
    };

    try {
      const config: AxiosRequestConfig = {
        headers: { ...headers },
      };

      const requestHeaders: Record<string, string> = {
        ...(config.headers as Record<string, string>),
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      };

      if (server.config.headers) {
        for (const [key, value] of Object.entries(server.config.headers)) {
          requestHeaders[key] = String(value);
        }
      }
      config.headers = requestHeaders;

      const response = await server.httpClient.post('', requestBody, config);
      const contentType = response.headers['content-type'] || '';

      if (contentType.includes('text/event-stream')) {
        const lines: Array<string> = response.data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const _data = lines.filter(_ => _.startsWith('data'))[0]
            if (_data) {
              const _dataFormatted = _data.slice(6)
              const _dataResolved = JSON.parse(_dataFormatted)
              return _dataResolved
            } else {
              return {}
            }
          }
        }
      } else {
        return response.data;
      }
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`HTTP request failed: ${message}`);
      if (!options?.suppressFailureBroadcast) {
        await this.mcpServerLoader.reportConnectionFailure(server.config, message);
      }
      throw err instanceof Error ? err : new Error(message);
    }
  }
}

export const streamableHTTPProvider = StreamableHTTPProvider
export default streamableHTTPProvider