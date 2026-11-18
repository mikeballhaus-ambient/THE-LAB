import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { webFetchSchemaFields } from '../../../../shared/types';
import { htmlResponseToPlainText, truncateToolResultContent } from '../../../../shared/utils/tool-result-content';

// 1. Initialize the native Web Fetch Server
export const webFetchMcpServer = new McpServer({
  name: 'system-web-fetch-server',
  version: '1.0.0',
});

// Description for the tool
const WEB_FETCH_DESC = 'Fetches the raw contents of a URL over HTTP or HTTPS with a maximum response size limit of 10KB to prevent context overflow.';

webFetchMcpServer.registerTool(
  'web_fetch',
  {
    description: WEB_FETCH_DESC,
    inputSchema: webFetchSchemaFields,
  },
  async ({ url }) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain,*/*'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [{ type: 'text', text: `HTTP Error (${response.status}): ${response.statusText}${errorText ? ' - ' + errorText : ''}` }],
          isError: true
        };
      }

      // Read the response body with size limit
      const reader = response.body?.getReader();
      if (!reader) {
        return {
          content: [{ type: 'text', text: 'Response body is not readable' }],
          isError: true
        };
      }

      const chunks: Uint8Array[] = [];
      const MAX_SIZE = 10240; // 10KB limit
      let totalSize = 0;

      const finalizeBody = (raw: string, truncatedExtra?: string): { text: string; isError: boolean } => {
        let text = htmlResponseToPlainText(raw);
        if (truncatedExtra) {
          text += truncatedExtra;
        }
        text = truncateToolResultContent(text);
        return { text, isError: false };
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        totalSize += value.length;

        if (totalSize >= MAX_SIZE) {
          const truncatedChunks = chunks.slice(0, -1);
          const raw = Buffer.from(Buffer.concat(truncatedChunks)).toString('utf-8');
          const { text } = finalizeBody(
            raw,
            `\n\n[Response truncated: ${totalSize - MAX_SIZE} bytes removed while downloading.]`,
          );
          return {
            content: [{ type: 'text', text }],
            isError: false,
          };
        }
      }

      const raw = Buffer.from(Buffer.concat(chunks)).toString('utf-8');
      const { text } = finalizeBody(raw);

      return {
        content: [{ type: 'text', text }],
        isError: false,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown network error occurred while fetching URL.';
      return {
        content: [{ type: 'text', text: errorMsg }],
        isError: true
      };
    }
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const webFetchToolsManifest = [
  {
    id: 'web_fetch',
    name: 'Web Fetch',
    description: WEB_FETCH_DESC,
    params: webFetchSchemaFields,
  },
];
