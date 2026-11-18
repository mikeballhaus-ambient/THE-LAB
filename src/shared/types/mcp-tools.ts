import { z } from 'zod';

export interface MCPToolInterface<S extends z.ZodTypeAny> {
  id: string;
  name: string;
  description: string;
  params?: S;
  isExternal?: boolean;
  serverId?: number;
  serverName?: string;
  display?: string
  execute(params: z.infer<S>): Promise<MCPToolResponse>;
}
export interface MCPToolCall {
  id: string;
  type: 'function';
  function: {
    name: string,
    arguments?: string
  }
}

export interface MCPToolSchema {
  type: "function",
  function: {
    name: string,
    description: string,
    parameters: {
      discriminator?: unknown;
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    } | {
      type: string;
      properties: Record<string, never>;
    }
  }
}

export interface MCPToolResponse {
  type: 'tool_result';
  tool_call_id: string;
  function: string;
  success: boolean;
  content: string;
  bypassAgentNotification?: boolean
}

export interface MCPToolData {
  toolcall: MCPToolCall;
  toolresult: MCPToolResponse
}

export interface ToolsList {
  id: string,
  name: string,
  description: string;
  isExternal?: boolean;
  serverId?: number;
  serverName?: string;
  display?: string
}

export const EXCLUDED_DIRS = [
  '.roo',
  '.git',
  '.vscode',
  'chroma-data',
  'dist',
  'logs',
  'node_modules'
];

export const isExcludedDir = (filename: string): boolean => {
  // Exact match
  if (EXCLUDED_DIRS.includes(filename)) {
    return true;
  }

  // Case-insensitive match
  const lowerName = filename.toLowerCase();
  for (const excluded of EXCLUDED_DIRS) {
    if (lowerName === excluded.toLowerCase()) {
      return true;
    }
  }

  return false;
}

export const diffColors = {
  additive: {
    light: 'bg-green-800',
    dark: 'bg-green-900/80',
    text: 'text-green-500'
  },
  subtractive: {
    light: 'bg-red-800',
    dark: 'bg-red-900/80',
    text: 'text-red-500'
  }
}

export interface DiffItem {
  html: string,
  patchRemovals: number,
  patchAdditions: number
}

export interface FileChanges {
  path: string | undefined,
  html: string,
  totalRemovals: number,
  totalAdditions: number
}

export interface FileOperations extends FileChanges {
  type: 'create' | 'remove' | 'update',
}