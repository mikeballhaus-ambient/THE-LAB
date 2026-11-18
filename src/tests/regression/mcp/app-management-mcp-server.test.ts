import { describe, test, expect, beforeAll } from '@jest/globals';
import { 
  createAppSchemaFields, 
  getAppSchemaFields, 
  getAppsSchemaFields, 
  updateAppSchemaFields,
  deleteAppSchemaFields 
} from '@/shared/types';
import { appManagementMcpServer, appManagementToolsManifest } from '@/backend/mcp/mcp-servers/apps/app-management-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('appManagementMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(appManagementMcpServer, appManagementToolsManifest);
    });

    test('Execute create_app with valid parameters', async () => {
      const tool = registry.getTool('app_management_create_app', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        userId: 1,
        type: 'browser',
        name: 'Test App',
        description: 'A test application',
        faIcon: 'fa-test',
        order: 1,
        componentPath: './front-end/App.vue',
        isEnabled: true,
        isServerSideEnabled: false,
        serverEntry: null,
        serverPort: null,
        serverEnv: null,
        version: '1.0.0'
      };

      const params = createAppSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return app creation result
        expect(result).toBeDefined();
      }
    });

    test('Execute get_app with valid ID', async () => {
      const tool = registry.getTool('app_management_get_app', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        userId: 1,
        id: 'test-app-id'
      };

      const params = getAppSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return app data or error if not found
        expect(result).toBeDefined();
      }
    });

    test('Execute get_apps with default parameters', async () => {
      const tool = registry.getTool('app_management_get_apps', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        userId: 1
      };

      const params = getAppsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return apps list or error
        expect(result).toBeDefined();
      }
    });

    test('Execute get_apps with type filter', async () => {
      const tool = registry.getTool('app_management_get_apps', 1);
      const validParams = {
        userId: 1,
        type: 'browser'
      };

      const params = getAppsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return filtered apps
        expect(result).toBeDefined();
      }
    });

    test('Execute update_app with valid parameters', async () => {
      const tool = registry.getTool('app_management_update_app', 1);
      const validParams = {
        userId: 1,
        id: 'test-app-id',
        name: 'Updated App Name'
      };

      const params = updateAppSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return update result
        expect(result).toBeDefined();
      }
    });

    test('Execute delete_app with valid parameters', async () => {
      const tool = registry.getTool('app_management_delete_app', 1);
      const validParams = {
        userId: 1,
        id: 'test-app-id'
      };

      const params = deleteAppSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return delete result
        expect(result).toBeDefined();
      }
    });
  })
})
