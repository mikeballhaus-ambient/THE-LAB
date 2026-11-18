import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Import schema from shared types
import { awaiterSchemaFields } from '../../../../shared/types';
import { AwaiterUtils } from './utils/awaiter-utils';

// 1. Initialize the native Awaiter Server
export const awaiterMcpServer = new McpServer({
  name: 'system-awaiter-server',
  version: '1.0.0',
});

const AWAITER_DESC = `Pause the current task for a specified duration, then resume reasoning with optional context. Useful for rate limits, simulated delays, or waiting on external processes.`;

awaiterMcpServer.registerTool(
  'awaiter',
  {
    description: AWAITER_DESC,
    inputSchema: awaiterSchemaFields,
  },
  async ({ userId, sessionId, persona, waitForSeconds, context }) => {
    const delayMs = Math.max(0, Math.min(waitForSeconds, 3600)) * 1000;
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const result = await AwaiterUtils.awaiterHandler(
      userId,
      sessionId,
      persona,
      waitForSeconds,
      context,
    );

    return {
      content: [{ type: 'text', text: typeof result.content === 'string' ? result.content : JSON.stringify(result) }],
      isError: result.success === false,
    };
  },
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const awaiterToolsManifest = [
  {
    id: 'awaiter',
    name: 'Awaiter',
    description: AWAITER_DESC,
    params: awaiterSchemaFields,
  },
];
