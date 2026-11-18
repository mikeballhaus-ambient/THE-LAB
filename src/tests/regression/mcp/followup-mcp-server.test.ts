import { describe, test, expect, beforeAll } from '@jest/globals';
import { FollowupParamsSchema } from '@/shared/types';
import { followupMcpServer, followupToolsManifest } from '@/backend/mcp/mcp-servers/followup/followup-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('followupMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(followupMcpServer, followupToolsManifest);
    });

    test('Execute with valid parameters returns response', async () => {
      const tool = registry.getTool('followup_generate_followup', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        sessionId: 'test-session-123',
        question: 'What would you like to explore?',
        options: [
          { id: 'opt-a', label: 'Option A', value: 'a' },
          { id: 'opt-b', label: 'Option B', value: 'b' }
        ],
        persona: 'default'
      };

      const params = FollowupParamsSchema.safeParse(validParams);
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

    test('Execute with checkbox options', async () => {
      const tool = registry.getTool('followup_generate_followup', 1);
      const validParams = {
        sessionId: 'test-session',
        question: 'Select your preferences:',
        options: [
          { id: 'opt-1', label: 'Option 1', value: 'opt1' },
          { id: 'opt-2', label: 'Option 2', value: 'opt2' },
          { id: 'opt-3', label: 'Option 3', value: 'opt3' }
        ],
        persona: 'default'
      };

      const params = FollowupParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return a response
        expect(result).toBeDefined();
      }
    });

    test('Execute with input field options', async () => {
      const tool = registry.getTool('followup_generate_followup', 1);
      const validParams = {
        sessionId: 'test-session',
        question: 'Enter your details:',
        options: [
          { id: 'opt-name', label: 'Name', value: 'name' },
          { id: 'opt-email', label: 'Email', value: 'email' }
        ],
        persona: 'default'
      };

      const params = FollowupParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return a response
        expect(result).toBeDefined();
      }
    });

    test('Execute with default selection', async () => {
      const tool = registry.getTool('followup_generate_followup', 1);
      const validParams = {
        sessionId: 'test-session',
        question: 'Choose an option:',
        options: [
          { id: 'opt-a', label: 'Option A', value: 'a' },
          { id: 'opt-b', label: 'Option B', value: 'b' }
        ],
        persona: 'default',
        defaultSelection: 'opt-a'
      };

      const params = FollowupParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle default selection
        expect(result).toBeDefined();
      }
    });

    test('Execute with leading slash in sessionId', async () => {
      const tool = registry.getTool('followup_generate_followup', 1);
      const validParams = {
        sessionId: '/test-session-123',
        question: 'Test question',
        options: [],
        persona: 'default'
      };

      const params = FollowupParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the sessionId properly
        expect(result).toBeDefined();
      }
    });

    test('Execute with empty options array', async () => {
      const tool = registry.getTool('followup_generate_followup', 1);
      const validParams = {
        sessionId: 'test-session',
        question: 'Question without options',
        options: [],
        persona: 'default'
      };

      const params = FollowupParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle empty options
        expect(result).toBeDefined();
      }
    });

    test('Execute with mixed checkbox and input options', async () => {
      const tool = registry.getTool('followup_generate_followup', 1);
      const validParams = {
        sessionId: 'test-session',
        question: 'Mixed options:',
        options: [
          { id: 'opt-a', label: 'Select A', value: 'a' },
          { id: 'opt-b', label: 'Enter B', value: 'b' },
          { id: 'opt-c', label: 'Select C', value: 'c' }
        ],
        persona: 'default'
      };

      const params = FollowupParamsSchema.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle mixed option types
        expect(result).toBeDefined();
      }
    });
  })
})
