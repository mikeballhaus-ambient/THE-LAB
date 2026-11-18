import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ProviderService } from '../../../ai/provider-service';
import type { Server as SocketIOServer } from 'socket.io';
import { SOCKET_EVENTS } from '../../../../shared/types';
import { baseUtils } from '@/backend/utils/chat/base-utils';
import {
  switchPersonaSchemaFields,
  activatePersonaSchemaFields,
  responsePersonaSchemaFields,
} from '../../../../shared/types';
import { shouldUsePersonaDirectWorkflow } from '@/shared/config/lab-persona-direct-workflow';
import { runActivatePersonaDirect, runResponsePersonaDirect } from './utils/persona-workflow-bridge';

// 1. Initialize the Persona Manager Server
export const personaManagerMcpServer = new McpServer({
  name: 'system-persona-manager-server',
  version: '1.0.0',
});

const SWITCH_PERSONA_DESC = 'Changes the current session\'s active persona without creating a new session. Use this when you want to change how the AI assistant responds within the same conversation.';

personaManagerMcpServer.registerTool(
  'persona_manager_switch_persona',
  {
    description: SWITCH_PERSONA_DESC,
    inputSchema: switchPersonaSchemaFields,
  },
  async ({ sessionId, targetPersona }) => {
    const providerService = ProviderService.getInstance();
    const ioServer = providerService.getSocketIOServer();

    if (!ioServer) {
      return {
        content: [{ type: 'text', text: 'Error: Socket server is not ready. Unable to switch persona.' }],
        isError: true,
      };
    }

    try {
      await baseUtils.dispatchUIResponse(
        ioServer as SocketIOServer,
        SOCKET_EVENTS.PERSONA_SWITCHED,
        { sessionId, persona: targetPersona },
        500
      );

      return {
        content: [{ type: 'text', text: JSON.stringify({ sessionId, targetPersona, action: 'persona-switched' }) }],
        isError: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error switching persona: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

const ACTIVATE_PERSONA_DESC = 'Creates a new session with a specified persona, optionally initializing a todo list for task delegation. Use this when you need to delegate specific tasks to a specialized persona.';

personaManagerMcpServer.registerTool(
  'persona_manager_activate_persona',
  {
    description: ACTIVATE_PERSONA_DESC,
    inputSchema: activatePersonaSchemaFields,
  },
  async (params) => {
    if (!shouldUsePersonaDirectWorkflow()) {
      return {
        content: [{ type: 'text', text: 'Error: Persona delegation is disabled (LAB_PERSONA_DIRECT_WORKFLOW=0).' }],
        isError: true,
      };
    }
    const direct = await runActivatePersonaDirect(params);
    return {
      content: [{ type: 'text', text: direct.text }],
      isError: !direct.success,
    };
  }
);

const RESPONSE_PERSONA_DESC = 'Child persona returns control to parent with task results. Use this when a child persona has completed its work and needs to report back to the parent session.';

personaManagerMcpServer.registerTool(
  'persona_manager_response_persona',
  {
    description: RESPONSE_PERSONA_DESC,
    inputSchema: responsePersonaSchemaFields,
  },
  async (params) => {
    if (!shouldUsePersonaDirectWorkflow()) {
      return {
        content: [{ type: 'text', text: 'Error: Persona delegation is disabled (LAB_PERSONA_DIRECT_WORKFLOW=0).' }],
        isError: true,
      };
    }
    const direct = await runResponsePersonaDirect(params);
    return {
      content: [{ type: 'text', text: direct.text }],
      isError: !direct.success,
    };
  }
);

export const personaManagerToolsManifest = [
  {
    id: 'persona_manager_switch_persona',
    name: 'Persona Manager - Switch Persona',
    description: SWITCH_PERSONA_DESC,
    params: switchPersonaSchemaFields,
  },
  {
    id: 'persona_manager_activate_persona',
    name: 'Persona Manager - Activate Persona',
    description: ACTIVATE_PERSONA_DESC,
    params: activatePersonaSchemaFields,
  },
  {
    id: 'persona_manager_response_persona',
    name: 'Persona Manager - Response Persona',
    description: RESPONSE_PERSONA_DESC,
    params: responsePersonaSchemaFields,
  },
];
