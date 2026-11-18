import { MCPToolCall, MCPToolResponse } from '../../../../shared/types';
import { switchPersonaSchemaFields, activatePersonaSchemaFields, responsePersonaSchemaFields } from '../../../../shared/types';

export function formatPersonaManagerToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';
  const toolParams = JSON.parse(toolCall.function.arguments || '{}');
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">Persona Manager</div><div class="text-lab-general-text">`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  // Handle switch-persona operation
  if (toolCall.function.name === 'persona_manager_switch_persona') {
    const { sessionId, targetPersona } = switchPersonaSchemaFields.parse(toolParams);

    htmlOutput += `<div class="italic text-lab-general-text">Operation: persona_manager_switch_persona</div>`;
    htmlOutput += `<div>Session ID: ${sessionId || 'N/A'}</div>`;
    htmlOutput += `<div>Target Persona: <code>${targetPersona || 'N/A'}</code></div>`;

    if (content.includes('persona-switched')) {
      const data = JSON.parse(content);
      htmlOutput += `<div class="text-green-400 mt-2">✓ Successfully switched to persona: ${data.targetPersona}</div>`;
    } else {
      htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto">${content}</div>`;
    }
  }
  // Handle activate-persona operation
  else if (toolCall.function.name === 'persona_manager_activate_persona') {
    const { userId, sessionId, parentPersona, targetPersona, message, todoListId, todoListName, todos } = activatePersonaSchemaFields.parse(toolParams);

    htmlOutput += `<div class="italic text-lab-general-text">Operation: persona_manager_activate_persona</div>`;
    htmlOutput += `<div>User ID: ${userId || 'N/A'}</div>`;
    htmlOutput += `<div>Session ID: ${sessionId || 'N/A'}</div>`;
    htmlOutput += `<div>Parent Persona: <code>${parentPersona || 'N/A'}</code></div>`;
    htmlOutput += `<div>Target Persona: <code>${targetPersona || 'N/A'}</code></div>`;
    htmlOutput += `<div>Message Length: ${message?.length || 0} characters</div>`;

    if (todoListId && todoListName) {
      htmlOutput += `<div class="mt-1">Todo List ID: <code>${todoListId}</code></div>`;
      htmlOutput += `<div>Todo List Name: ${todoListName || 'N/A'}</div>`;
    }

    if (todos && todos.length > 0) {
      htmlOutput += `<div class="mt-1">Todos Count: ${todos.length}</div>`;
      todos.forEach((todo: Record<string, unknown>, idx: number) => {
        htmlOutput += `<div class="mt-1">[${idx + 1}] ${String(todo.todoItem ?? 'Untitled')}</div>`;
      });
    }

    try {
      const data = JSON.parse(content) as {
        newSessionId?: string;
        chatId?: string;
        targetPersona?: string;
        assistantResponse?: string;
        action?: string;
      };
      if (data.action === 'activate-persona' || data.newSessionId) {
        htmlOutput += `<div class="text-green-400 mt-2">✓ Persona delegation completed</div>`;
        if (data.newSessionId) {
          htmlOutput += `<div class="mt-1">Child session ID: <code>${data.newSessionId}</code></div>`;
        }
        if (data.chatId) {
          htmlOutput += `<div>Chat ID: <code>${data.chatId}</code></div>`;
        }
        if (data.targetPersona) {
          htmlOutput += `<div>Target persona: <code>${data.targetPersona}</code></div>`;
        }
        if (data.newSessionId) {
          htmlOutput += `<div class="text-cyan-300 mt-2">Open the child session tab (session <code>${data.newSessionId}</code>) to review the delegated run.</div>`;
        }
        if (data.assistantResponse) {
          htmlOutput += `<div class="mt-2 text-lab-general-text-muted max-h-[120px] overflow-auto">${data.assistantResponse.substring(0, 800)}</div>`;
        }
      } else {
        htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto">${content}</div>`;
      }
    } catch {
      htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto">${content}</div>`;
    }
  }
  // Handle response-persona operation
  else if (toolCall.function.name === 'persona_manager_response_persona') {
    const { userId, sessionId, message, success, parentSessionId, parentPersona, chatId } = responsePersonaSchemaFields.parse(toolParams);

    htmlOutput += `<div class="italic text-lab-general-text">Operation: persona_manager_response_persona</div>`;
    htmlOutput += `<div>User ID: ${userId || 'N/A'}</div>`;
    htmlOutput += `<div>Session ID: ${sessionId || 'N/A'}</div>`;
    htmlOutput += `<div>Message Length: ${message?.length || 0} characters</div>`;
    htmlOutput += `<div>Success: <code>${success ? 'true' : 'false'}</code></div>`;
    htmlOutput += `<div>Parent Session ID: ${parentSessionId || 'N/A'}</div>`;
    htmlOutput += `<div>Parent Persona: <code>${parentPersona || 'N/A'}</code></div>`;
    htmlOutput += `<div>Chat ID: ${chatId || 'N/A'}</div>`;

    if (content.includes('success')) {
      const data = JSON.parse(content);
      htmlOutput += `<div class="text-green-400 mt-2">✓ Persona response sent successfully</div>`;
      htmlOutput += `<div>Message: ${data.message || 'N/A'}</div>`;
      htmlOutput += `<div>Success: ${data.success ? 'true' : 'false'}</div>`;
    } else {
      htmlOutput += `<div class="mt-2 whitespace-pre-wrap max-h-[100px] overflow-auto">${content}</div>`;
    }
  }
  else {
    htmlOutput += '<div class="italic text-lab-general-text-muted max-h-[100px] overflow-auto">Available fields in response:</div>';
    const data = JSON.parse(content);
    Object.keys(data).forEach(key => {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        const formattedValue = value.replace(/\n/g, '<br/>');
        htmlOutput += `<div class="mt-1 text-lab-general-text">- <span class="font-semibold text-lab-general-text">${key}:</span> ${formattedValue.substring(0, 500)}${formattedValue.length > 500 ? ' ... (truncated)' : ''}</div>`;
      } else {
        htmlOutput += `<div class="mt-1 text-lab-general-text">- <span class="font-semibold text-lab-general-text">${key}:</span> <code>${JSON.stringify(value).substring(0, 500)}</code><span class="text-xs text-lab-general-text-muted">(${JSON.stringify(value).length > 500 ? 'truncated' : ''})</span></div>`;
      }
    });
  }

  return htmlOutput + '</div></div>';
}
