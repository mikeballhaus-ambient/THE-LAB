import { AxiosInstance } from 'axios';
import type { z } from 'zod';

/**
 * MCP Server Configuration Interface
 * Represents a user-configured external MCP server
 */
export interface IMCPServerConfig {
    id: number;
    userId: number;           // Required - no optional userId
    name: string;
    transport?: 'stdio' | 'streamable-http';
    command?: string;         // e.g., 'npx', 'python', 'node'
    args?: string[];          // e.g., ['-lspm', '@modelcontextprotocol/server-filesystem', '/path']
    cwd?: string;            // Working directory for the spawned process
    env?: Record<string, string>;  // Environment variables to set/override
    url?: string;            // For HTTP-based MCP servers
    headers?: Record<string, string>;  // Headers for HTTP requests (auth, etc.)
    timeout?: number;        // Connection timeout in seconds
    enabled: boolean;
    created_at: string;
    updated_at: string;
    isConnected?: boolean;
    connectionError?: string;
    tools?: MCPToolManifest[]
}

/**
 * External MCP Server State Interface
 * Represents an actively running external MCP server instance
 */
export interface IExternalMCPServer {
    config: IMCPServerConfig;
    process?: import('child_process').ChildProcess;
    httpClient?: AxiosInstance;
}

export interface MCPToolManifest {
  id: string,
  name: string; 
  description: string; 
  params: z.ZodTypeAny;
  display?: string;
  serverId?: number;
  serverName?: string;
}

