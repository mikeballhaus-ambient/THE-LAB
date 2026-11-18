import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderService } from '../../../ai/provider-service';
import { SOCKET_EVENTS, ChatPersona, FollowupEventData, FollowupParamsSchema } from '../../../../shared/types';

// 1. Initialize the native Followup Server
export const followupMcpServer = new McpServer({
  name: 'system-followup-server',
  version: '1.0.0',
});

// ==========================================
// TOOL 1: Generate Followup
// ==========================================
export const generateFollowupSchemaFields = FollowupParamsSchema;

followupMcpServer.registerTool(
  'followup_generate_followup',
  {
    description: 'This tool generates interactive follow-up questions for user input in THE-LAB chat sessions. Agents can mix checkboxes and input fields freely in a single call.',
    inputSchema: generateFollowupSchemaFields,
  },
  async ({ sessionId, question, options, persona, defaultSelection }: z.infer<typeof generateFollowupSchemaFields>) => {
    try {
      const providerService = ProviderService.getInstance();
      const socket = providerService.getSocketConnection();

      if (!socket) {
        return {
          content: [{ type: 'text', text: 'Warning: Unable to generate followup because the socket server is not ready.' }],
          isError: true,
        };
      }

      const uiResponsePromise = new Promise<{ content: Array<{ type: 'text'; text: string }>, isError: boolean }>((resolve) => {
        socket.once(SOCKET_EVENTS.FOLLOWUP_RESPONSE, async (data: FollowupEventData) => {
          try {

            // Build user message with selection context
            const responseMessage: string = `User has responded to the follow-up.

\`\`\`json
${JSON.stringify(data)}
\`\`\`

Continue based on these selections.`;

            resolve({ content: [{ type: 'text' as const, text: responseMessage }], isError: false });
          } catch {

            resolve({ content: [{ type: 'text' as const, text: 'Warning: Unable to discover elements because the socket server is not ready.' }], isError: true });
          }
        });
      })

      // Emit discovery event to UI
      socket.emit(SOCKET_EVENTS.FOLLOWUP_REQUEST, {
        chatId: crypto.randomUUID(),
        sessionId,
        persona: persona as ChatPersona,
        followupData: { sessionId, question, options, persona, defaultSelection }
      });

      return await uiResponsePromise
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while generating followup.';
      return {
        content: [{ type: 'text', text: `Error during followup generation: ${errorMessage}` }],
        isError: true,
      };
    }
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const followupToolsManifest = [
  {
    id: 'followup_generate_followup',
    name: 'Followup - Generate Followup',
    description: 'This tool generates interactive follow-up questions for user input in THE-LAB chat sessions. Agents can mix checkboxes and input fields freely in a single call.',
    params: generateFollowupSchemaFields,
  },
];
