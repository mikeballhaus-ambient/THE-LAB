import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { webQuerySchemaFields } from '../../../../shared/types';

// 1. Initialize the native Web Query Server
export const webQueryMcpServer = new McpServer({
  name: 'system-web-query-server',
  version: '1.0.0',
});

// API details
const BASE_API_URL = process.env.VITE_WEB_QUERY_BASEURL;
const AUTH_TOKEN = process.env.VITE_WEB_QUERY_API_KEY;

const WEB_QUERY_DESC = 'Performs a web search using the configured API and returns relevant results.';

// Shared headers helper
const getHeaders = () => ({
  'Authorization': `Bearer ${AUTH_TOKEN}`
});

// Helper to handle API requests and structure standard outputs
async function fetchFromWebQuery(url: string, body?: string): Promise<{ text: string; isError: boolean }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.parse(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        text: `Web Query API error (${response.status}): ${response.statusText}${errorText ? ' - ' + errorText : ''}`,
        isError: true,
      };
    }

    const jsonResponse = await response.json();
    if (jsonResponse.error) {
      return {
        text: jsonResponse.error.message || 'Web Query API returned an internal server error',
        isError: true,
      };
    }

    return { text: JSON.stringify(jsonResponse), isError: false };
  } catch (error) {
    return {
      text: error instanceof Error ? error.message : 'Unknown network error occurred while reaching Web Query API.',
      isError: true,
    };
  }
}

// ==========================================
// TOOL 1: Web Query
// ==========================================
webQueryMcpServer.registerTool(
  'web_query',
  {
    description: WEB_QUERY_DESC,
    inputSchema: webQuerySchemaFields,
  },
  async ({ query, max_results = 5 }) => {
    if (!BASE_API_URL) {
      return { content: [{ type: 'text', text: 'Web Query has not been configured' }], isError: true };
    }

    const targetUrl = `${BASE_API_URL}`;
    const result = await fetchFromWebQuery(targetUrl, JSON.stringify({ query, max_results }));
    return { content: [{ type: 'text', text: result.text }], isError: result.isError };
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const webQueryToolsManifest = [
  {
    id: 'web_query',
    name: 'Web Query',
    description: WEB_QUERY_DESC,
    params: webQuerySchemaFields,
  },
];
