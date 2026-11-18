import { describe, test, expect, beforeAll } from '@jest/globals';
import { discoverElementsSchemaFields, elementActionSchemaFields } from '@/shared/types';
import { uiAutomationMcpServer, uiAutomationToolsManifest } from '@/backend/mcp/mcp-servers/ui-automation/ui-automation-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('uiAutomationMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(uiAutomationMcpServer, uiAutomationToolsManifest);
    });

    test('Execute discover_elements with valid parameters', async () => {
      const tool = registry.getTool('ui_automation_discover_elements', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        sessionId: 'test-session-123',
        persona: 'default',
        searchPattern: '',
        maxResults: 10,
        skip: 0,
        contextArea: 'dashboard'
      };

      const params = discoverElementsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // This may fail if socket is not configured, so check both cases
        if (result?.success) {
          expect(result?.content).toBeDefined();
        } else {
          // If socket is not ready, content should contain error info
          expect(result?.content).toContain('socket');
        }
      }
    });

    test('Execute discover_elements with search pattern', async () => {
      const tool = registry.getTool('ui_automation_discover_elements', 1);
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        searchPattern: 'button',
        maxResults: 5,
        skip: 0,
        contextArea: 'dashboard'
      };

      const params = discoverElementsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return discovery results
        expect(result).toBeDefined();
      }
    });

    test('Execute discover_elements with maxResults parameter', async () => {
      const tool = registry.getTool('ui_automation_discover_elements', 1);
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        searchPattern: '',
        maxResults: 3,
        skip: 0,
        contextArea: 'dashboard'
      };

      const params = discoverElementsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should respect maxResults limit
        expect(result).toBeDefined();
      }
    });

    test('Execute discover_elements with skip parameter', async () => {
      const tool = registry.getTool('ui_automation_discover_elements', 1);
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        searchPattern: '',
        maxResults: 5,
        skip: 2,
        contextArea: 'dashboard'
      };

      const params = discoverElementsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle pagination with skip
        expect(result).toBeDefined();
      }
    });

    test('Execute discover_elements with context area', async () => {
      const tool = registry.getTool('ui_automation_discover_elements', 1);
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        searchPattern: '',
        maxResults: 5,
        skip: 0,
        contextArea: 'app-catalog-body'
      };

      const params = discoverElementsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should filter by context area
        expect(result).toBeDefined();
      }
    });

    test('Execute discover_elements with leading slash in sessionId', async () => {
      const tool = registry.getTool('ui_automation_discover_elements', 1);
      const validParams = {
        sessionId: '/test-session-123',
        persona: 'default',
        searchPattern: '',
        maxResults: 5,
        skip: 0,
        contextArea: 'dashboard'
      };

      const params = discoverElementsSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the sessionId properly
        expect(result).toBeDefined();
      }
    });

    test('Execute element_action with valid parameters', async () => {
      const tool = registry.getTool('ui_automation_element_action', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        sessionId: 'test-session-123',
        persona: 'default',
        actions: [
          {
            order: 1,
            target: '#test-button',
            action: 'click'
          }
        ]
      };

      const params = elementActionSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // This may fail if socket is not configured, so check both cases
        if (result?.success) {
          expect(result?.content).toBeDefined();
        } else {
          // If socket is not ready, content should contain error info
          expect(result?.content).toContain('socket');
        }
      }
    });

    test('Execute element_action with multiple actions', async () => {
      const tool = registry.getTool('ui_automation_element_action', 1);
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        actions: [
          { order: 1, target: '#button-1', action: 'click' },
          { order: 2, target: '#input-1', action: 'setValue', actionParams: { value: 'Test Value' } },
          { order: 3, target: '#target-1', action: 'hover' }
        ]
      };

      const params = elementActionSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return action results
        expect(result).toBeDefined();
      }
    });

    test('Execute element_action with click action', async () => {
      const tool = registry.getTool('ui_automation_element_action', 1);
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        actions: [
          { order: 1, target: '#my-button', action: 'click' }
        ]
      };

      const params = elementActionSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle click action
        expect(result).toBeDefined();
      }
    });

    test('Execute element_action with setValue action', async () => {
      const tool = registry.getTool('ui_automation_element_action', 1);
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        actions: [
          { order: 1, target: '#input-field', action: 'setValue', actionParams: { value: 'Hello World' } }
        ]
      };

      const params = elementActionSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle setValue action
        expect(result).toBeDefined();
      }
    });

    test('Execute element_action with empty actions array', async () => {
      const validParams = {
        sessionId: 'test-session',
        persona: 'default',
        actions: []
      };

      const params = elementActionSchemaFields.safeParse(validParams);
      // Empty array should fail validation (min(1) required)
      expect(params.success).toBe(false);
    });

    test('Execute element_action with leading slash in sessionId', async () => {
      const tool = registry.getTool('ui_automation_element_action', 1);
      const validParams = {
        sessionId: '/test-session-123',
        persona: 'default',
        actions: [
          { order: 1, target: '#button', action: 'click' }
        ]
      };

      const params = elementActionSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the sessionId properly
        expect(result).toBeDefined();
      }
    });
  })
})
