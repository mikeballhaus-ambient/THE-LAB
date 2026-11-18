import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveLibrarySchemaFields, queryDocsSchemaFields } from '../../../../shared/types';

// 1. Initialize the native Context7 Server
export const context7McpServer = new McpServer({
  name: 'system-context7-server',
  version: '1.0.0',
});

// Base API details
const BASE_API_URL = process.env.VITE_CONTEXT7_BASEURL;
const AUTH_TOKEN = process.env.VITE_CONTEXT7_KEY;
const RESOLVE_LIB_DESC = 'Resolves a general programming library name into a Context7-compatible unique library ID format (e.g., "/facebook/react").';
const QUERY_DOCS_DESC  = 'Retrieves up-to-date documentation, type specs, and verified implementation code examples using a valid Context7 library ID.';


// Shared headers helper
const getHeaders = () => ({
  'Authorization': `Bearer ${AUTH_TOKEN}`
});

// Helper to handle API requests and structure standard outputs
async function fetchFromContext7(url: string): Promise<{ text: string; isError: boolean }> {
  try {
    const response = await fetch(url, { method: 'GET', headers: getHeaders() });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        text: `Context7 API error (${response.status}): ${response.statusText}${errorText ? ' - ' + errorText : ''}`,
        isError: true,
      };
    }

    const jsonResponse = await response.json();
    if (jsonResponse.error) {
      return {
        text: jsonResponse.error.message || 'Context7 API returned an internal server error',
        isError: true,
      };
    }

    return { text: JSON.stringify(jsonResponse), isError: false };
  } catch (error) {
    return {
      text: error instanceof Error ? error.message : 'Unknown network error occurred while reaching Context7 API.',
      isError: true,
    };
  }
}

// ==========================================
// TOOL 1: Resolve Library ID
// ==========================================
context7McpServer.registerTool(
  'context7_resolve_library_id',
  {
    description: RESOLVE_LIB_DESC,
    inputSchema: resolveLibrarySchemaFields,
  },
  async ({ libraryName, resolveQuery }) => {
    const targetUrl = `${BASE_API_URL}libs/search?libraryName=${encodeURIComponent(libraryName)}&query=${encodeURIComponent(resolveQuery)}&type=json`;
    const result = await fetchFromContext7(targetUrl);
    return { content: [{ type: 'text', text: result.text }], isError: result.isError };
  }
);

// ==========================================
// TOOL 2: Query Docs
// ==========================================
context7McpServer.registerTool(
  'context7_query_docs',
  {
    description: QUERY_DOCS_DESC,
    inputSchema: queryDocsSchemaFields,
  },
  async ({ libraryId, docsQuery }) => {
    const targetUrl = `${BASE_API_URL}context?libraryId=${encodeURIComponent(libraryId)}&query=${encodeURIComponent(docsQuery)}&type=json`;
    const result = await fetchFromContext7(targetUrl);
    return { content: [{ type: 'text', text: result.text }], isError: result.isError };
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const context7ToolsManifest = [
  {
    id: 'context7_resolve_library_id',
    name: 'Context7 - Resolve Library ID',
    description: RESOLVE_LIB_DESC,
    params: resolveLibrarySchemaFields,
  },
  {
    id: 'context7_query_docs',
    name: 'Context7 - Query Docs',
    description: QUERY_DOCS_DESC,
    params: queryDocsSchemaFields,
  },
];
