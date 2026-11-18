import type { User } from '@/shared/types/user';
import type { MCPToolInterface } from '@/shared/types/mcp-tools';
import { isLabProductionProfile } from '@/shared/config/lab-production-profile';
import { mcpServersService } from '../db/MCPServers/mcp-servers-service';
import { mcpStdioAccessService } from '../db/MCPStdioAccess/mcp-stdio-access-service';
import { evaluateAppScopedMcpToolAccess } from '@/shared/services/mcp-app-authorization';
import type { z } from 'zod';

export { resolveTargetAppIdsFromToolParams } from '@/shared/services/mcp-app-authorization';

const ADMIN_ONLY_TOOL_IDS = new Set(['run_terminal_command', 'app_management_execute_raw']);

const CODE_CHANGE_TOOL_IDS = new Set([
  'create_directory',
  'create_file',
  'remove_file',
  'remove_directory',
  'update_file_update_file',
  'documentor_save_document',
  'documentor_update_document',
  'app_management_create_app',
  'app_management_update_app',
  'app_management_delete_app',
  'app_management_add_table',
  'app_management_remove_table',
  'app_management_add_column',
  'app_management_remove_column',
  'app_management_insert',
  'app_management_update',
  'app_management_delete',
]);

export interface McpProductionPolicyInput {
  user: User | null | undefined;
  userId: number;
  toolId: string;
  tool: MCPToolInterface<z.ZodObject<z.ZodRawShape>> | undefined;
  params: Record<string, unknown>;
}

export interface McpProductionPolicyResult {
  allowed: boolean;
  reason?: string;
}

function isOwnerOrAdmin(user: User | null | undefined): boolean {
  return user?.role === 'owner' || user?.role === 'admin';
}

function isUiAutomationTool(toolId: string): boolean {
  return toolId === 'ui_automation' || toolId.startsWith('ui_automation_');
}

function externalServerTransport(userId: number, serverId: number | undefined): string | undefined {
  if (serverId == null) {
    return undefined;
  }
  return mcpServersService.getMCPServerConfig(userId, serverId)?.transport;
}

/**
 * **D-03** — enforced when `LAB_PRODUCTION_PROFILE=1` only.
 */
export function evaluateMcpProductionPolicy(input: McpProductionPolicyInput): McpProductionPolicyResult {
  if (!isLabProductionProfile()) {
    return { allowed: true };
  }

  const { user, userId, toolId, tool, params } = input;

  if (isUiAutomationTool(toolId)) {
    return { allowed: true };
  }

  if (ADMIN_ONLY_TOOL_IDS.has(toolId)) {
    if (isOwnerOrAdmin(user)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Tool "${toolId}" is restricted to owner/admin in production profile`,
    };
  }

  if (tool?.isExternal && tool.serverId != null) {
    const transport = externalServerTransport(userId, tool.serverId);
    if (transport === 'streamable-http') {
      return { allowed: true };
    }
    if (transport === 'stdio') {
      if (isOwnerOrAdmin(user)) {
        return { allowed: true };
      }
      if (mcpStdioAccessService.isServerAllowlisted(userId, tool.serverId)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason:
          'Stdio MCP tools require owner/admin or an approved Settings access request in production profile',
      };
    }
  }

  if (CODE_CHANGE_TOOL_IDS.has(toolId)) {
    return evaluateAppScopedMcpToolAccess(user, toolId, params);
  }

  return { allowed: true };
}
