import { ZodSafeParseResult } from 'zod';
import { MCPToolCall, MCPToolResponse, ToolsList, DiffItem, FileChanges, diffColors } from '../../../shared/types';
import { sanitizeLabHtml } from '@/shared/utils/sanitize-lab-html';
import * as baseUtils from './utils';
import { LAB_CHAT_TOOL_RESULT_CLASSES } from '@/shared/theme/lab-chat-classes';

export function useMcpToolFormatter() {

  let toolsData: ToolsList[] = [];

  const toolResultContainerClasses = LAB_CHAT_TOOL_RESULT_CLASSES;

  function initMcpFormatter(toolsList: ToolsList[]) {
    toolsData = toolsList
  }

  function getMcpToolName(toolCall: MCPToolCall): string {

    if (!toolCall?.function?.name) {
      return '';
    }

    const toolId = toolCall.function.name;
    const toolData = baseUtils.matchTool(toolsData, toolId);

    if (toolData?.name) {
      return toolData.name;
    }

    return baseUtils.fallbackToolDisplayName(toolId);
  }

  function formatMcpToolResult(toolCall: MCPToolCall, toolResult: MCPToolResponse): string {

    if (!toolResult) {
      return `<div class="${toolResultContainerClasses}"><div class="text-lab-chat-log-error">Tool call failed: unknown</div><div class="text-lab-chat-tool-result text-xs mt-1">No error details</div></div>`;
    }

    const toolData = baseUtils.matchTool(toolsData, toolCall.function.name);

    let htmlOutput = `<div class="${toolResultContainerClasses}">`;

    htmlOutput += `<div id="mcp-result-${toolResult.tool_call_id}">`;
    if (toolData) {
      htmlOutput += `<div class="font-semibold">Result for tool: ${toolData.name}</div>`;
      switch (toolData.id) {
        case 'run_terminal_command': {
          htmlOutput += baseUtils.formatRunTerminalCommandToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'create_directory': {
          htmlOutput += baseUtils.formatCreateDirectoryToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'remove_directory': {
          htmlOutput += baseUtils.formatRemoveDirectoryToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        // Create File Tool (refactored from single tool to MCP server)
        case 'create_file': {
          htmlOutput += baseUtils.formatCreateFileToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'list_files': {
          htmlOutput += baseUtils.formatListFilesToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'search_repository': {
          htmlOutput += baseUtils.formatSearchRepositoryToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        // Documentor tools (refactored from single tool to 4 separate tools)
        case 'documentor_save_document':
        case 'documentor_get_line_content':
        case 'documentor_get_diff_template':
        case 'documentor_update_document': {
          htmlOutput += baseUtils.formatDocumentorToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'read_file': {
          htmlOutput += baseUtils.formatReadFileToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'remove_file': {
          htmlOutput += baseUtils.formatRemoveFileToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'update_file': {
          htmlOutput += baseUtils.formatUpdateFileToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'persona_manager': {
          htmlOutput += baseUtils.formatPersonaManagerToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'web_fetch': {
          htmlOutput += baseUtils.formatWebFetchToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'web_query': {
          htmlOutput += baseUtils.formatWebQueryToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'todo_list_create_list':
        case 'todo_list_add_todo_item':
        case 'todo_list_update_todo_item':
        case 'todo_list_mark_todo_item_completed':
        case 'todo_list_mark_todo_item_incomplete':
        case 'todo_list_complete_todo_list':
        case 'todo_list_get_todo_list_state':
        case 'todo_list_list_todo_lists':
        case 'todo_list_remove_todo_list':
        case 'todo_list_remove_todo_item': {
          htmlOutput += baseUtils.formatToDoListToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        // App Management Tools (14 tools from app-management-mcp-server)
        case 'app_management_create_app':
        case 'app_management_get_app':
        case 'app_management_get_apps':
        case 'app_management_update_app':
        case 'app_management_delete_app':
        case 'app_management_add_table':
        case 'app_management_remove_table':
        case 'app_management_add_column':
        case 'app_management_remove_column':
        case 'app_management_select':
        case 'app_management_insert':
        case 'app_management_update':
        case 'app_management_delete':
        case 'app_management_execute_raw': {
          htmlOutput += baseUtils.formatAppManagementToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'context7_resolve_library_id':
        case 'context7_query_docs': {
          htmlOutput += baseUtils.formatContext7ToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        // Persona Manager Tools (3 tools from persona-manager-mcp-server)
        case 'persona_manager_switch_persona':
        case 'persona_manager_activate_persona':
        case 'persona_manager_response_persona': {
          htmlOutput += baseUtils.formatPersonaManagerToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'update_file_get_line_content':
        case 'update_file_get_diff_template':
        case 'update_file_update_file': {
          htmlOutput += baseUtils.formatUpdateFileToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'followup_generate_followup': {
          htmlOutput += baseUtils.formatFollowupToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'ui_automation_discover_elements':
        case 'ui_automation_element_action': {
          htmlOutput += baseUtils.formatUiAutomationToolResult(toolResultContainerClasses, toolCall, toolResult);
          break;
        }
        case 'awaiter': {
          htmlOutput += baseUtils.formatAwaiterToolResult(toolResultContainerClasses, toolCall, toolResult)
          break;
        }
        default: {
          htmlOutput += baseUtils.formatDefaultResult(toolResultContainerClasses, toolCall, toolResult)
          break;
        }
      }
    } else {
      const label = baseUtils.fallbackToolDisplayName(toolCall.function.name);
      htmlOutput += `<div class="font-semibold">Result for tool: ${label}</div>`;
      htmlOutput += baseUtils.formatDefaultResult(toolResultContainerClasses, toolCall, toolResult);
    }

    htmlOutput += `</div></div>`;
    return sanitizeLabHtml(htmlOutput);
  }

  function handleNewFileDiff(paramsResult: ZodSafeParseResult<{
    path: string;
    content: string;
    overwrite: boolean;
    ensureDir: boolean;
  }>, showPath: boolean, altPath?: string): FileChanges {
    return baseUtils.handleNewFileDiff(paramsResult, showPath, altPath)
  }

  function handleFileDiffs(params: ZodSafeParseResult<{
    path: string;
    diffs: {
      start_line: number;
      updated: string;
      original?: string | undefined;
      is_additive?: boolean | undefined;
    }[] | undefined;
  }>, showPath: boolean, altPath?: string): FileChanges {

    return baseUtils.handleFileDiffs(params, showPath, altPath)
  }

  function addDiffLines(isAdditive: boolean, startLine: number, originalLines: number, lines: string[], showPath: boolean, altPath?: string): string {
    void altPath;
    return baseUtils.addDiffLines(isAdditive, startLine, originalLines, lines, showPath)
  }

  function handleDiff(curDiff: ZodSafeParseResult<{
    start_line: number;
    updated: string;
    original?: string | undefined;
    is_additive?: boolean | undefined;
  }>, showPath: boolean, altPath?: string): DiffItem {
    return baseUtils.handleDiff(curDiff, showPath, altPath)
  }

  // Helper function to escape HTML
  function escapeHtml(text: string): string {
    return baseUtils.escapeHtml(text)
  }

  function handleRemoveFile(params: ZodSafeParseResult<{
    path: string;
    recursive: boolean;
    force: boolean;
  }>, showPath: boolean, altPath?: string): FileChanges {
    return baseUtils.handleRemoveFile(toolResultContainerClasses, params, showPath, altPath)
  }

  return {
    initMcpFormatter,
    getMcpToolName,
    formatMcpToolResult,
    diffColors,
    addDiffLines,
    handleDiff,
    handleFileDiffs,
    handleNewFileDiff,
    handleRemoveFile,
    escapeHtml
  };
}
