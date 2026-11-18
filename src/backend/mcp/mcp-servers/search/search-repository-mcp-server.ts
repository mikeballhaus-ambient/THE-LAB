import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { searchRepositorySchemaFields } from '../../../../shared/types';

// 1. Initialize the native Search Repository Server
export const searchRepositoryMcpServer = new McpServer({
  name: 'system-search-repository-server',
  version: '1.0.0',
});

// Tool description
const SEARCH_REPO_DESC = `Performs semantic pattern-based search across repository files using JavaScript regex patterns with optional glob filtering. Recursively searches directories relative to project root and returns matches with line numbers, matched content, and surrounding context.`;

searchRepositoryMcpServer.registerTool(
  'search_repository',
  {
    description: SEARCH_REPO_DESC,
    inputSchema: searchRepositorySchemaFields,
  },
  async ({ regex, file_pattern, match_case }) => {
    try {
      const result = await import('./utils/SearchHelper').then(m => m.performSearch(regex, file_pattern, 50, match_case || false));
      
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Search failed: ${errorMessage}` }],
        isError: true
      };
    }
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const searchRepositoryToolsManifest = [
  {
    id: 'search_repository',
    name: 'Search Repository',
    description: SEARCH_REPO_DESC,
    params: searchRepositorySchemaFields,
  },
];
