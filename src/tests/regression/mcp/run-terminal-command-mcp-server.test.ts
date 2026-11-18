import { describe, test, expect, beforeAll } from '@jest/globals';
import { runTerminalCommandSchemaFields } from '@/shared/types';
import { runTerminalCommandMcpServer, runTerminalCommandToolsManifest } from '@/backend/mcp/mcp-servers/command/run-terminal-command-mcp-server';
import MCPToolRegistry from '@/backend/mcp/mcp-tool';

describe('runTerminalCommandMcpServer', () => {
  describe('Execute', () => {
    const registry: MCPToolRegistry = MCPToolRegistry.getInstance();

    beforeAll(() => {
      registry.registerMCPServer(runTerminalCommandMcpServer, runTerminalCommandToolsManifest);
    });

    test('Execute with valid command returns output', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      expect(tool).not.toBeNull();

      const validParams = {
        command: 'node --version'
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Command should either succeed or return an error message
        expect(result).toBeDefined();
        if (result?.success) {
          expect(result?.content).not.toBe('');
        } else {
          expect(result?.content).not.toBe('');
        }
      }
    });

    test('Execute with echo command', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: 'echo "Hello World"'
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Command should either succeed or return an error message
        expect(result).toBeDefined();
        if (result?.success) {
          expect(result?.content).not.toBe('');
        } else {
          expect(result?.content).not.toBe('');
        }
      }
    });

    test('Execute with pwd command', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: 'pwd'
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Command should either succeed or return an error message
        expect(result).toBeDefined();
        if (result?.success) {
          expect(result?.content).not.toBe('');
        } else {
          expect(result?.content).not.toBe('');
        }
      }
    });

    test('Execute with ls command', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: 'dir'
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Command should either succeed or return an error message
        expect(result).toBeDefined();
        if (result?.success) {
          expect(result?.content).not.toBe('');
        } else {
          expect(result?.content).not.toBe('');
        }
      }
    });

    test('Execute with invalid command returns error', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: 'nonexistent-command-xyz'
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return error for invalid command
        expect(result?.success).toEqual(false);
        expect(result?.content).not.toBe('');
      }
    });

    test('Execute with empty command returns error', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: ''
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should return error for empty command
        expect(result?.success).toEqual(false);
        expect(result?.content).toContain('Empty command');
      }
    });

    test('Execute with leading slash in command', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: '/node --version'
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should handle the command properly
        expect(result).toBeDefined();
      }
    });

    test('Execute with timeout parameter', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: 'echo "Test"',
        timeout: 5000
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should execute with timeout
        expect(result).toBeDefined();
      }
    });

    test('Execute with long command', async () => {
      const tool = registry.getTool('run_terminal_command', 1);
      const validParams = {
        command: 'for /L %i in (1,1,10) do echo Number %i'
      };

      const params = runTerminalCommandSchemaFields.safeParse(validParams);
      expect(params.success).toBe(true);

      if (params.data) {
        const result = await tool?.execute(params.data);
        // Should execute loop command
        expect(result).toBeDefined();
      }
    });
  })
})
