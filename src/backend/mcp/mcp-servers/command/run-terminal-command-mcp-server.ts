import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawnSync } from 'child_process';

// Import schema from shared types
import { runTerminalCommandSchemaFields } from '../../../../shared/types';

// 1. Initialize the native Run Terminal Command Server
export const runTerminalCommandMcpServer = new McpServer({
  name: 'system-run-terminal-command-server',
  version: '1.0.0',
});

// Tool description
const RUN_TERMINAL_COMMAND_DESC = 'Execute terminal commands on the system and returns their output. Commands run synchronously via spawnSync with PowerShell shell, returning stdout + stderr on success or error details with exit code on failure.';

runTerminalCommandMcpServer.registerTool(
  'run_terminal_command',
  {
    description: RUN_TERMINAL_COMMAND_DESC,
    inputSchema: runTerminalCommandSchemaFields,
  },
  async ({ command, timeout }) => {
    const cmd = command.trim();
    
    if (!cmd) {
      return {
        content: [{ type: 'text', text: 'Empty command provided.' }],
        isError: true
      };
    }

    try {
      // Get the command parameter and trim it
      const result = spawnSync(cmd, {
        encoding: 'utf-8',
        shell: 'powershell.exe',
        timeout: timeout,
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10
      });

      if (result.status === 0) {
        // Command succeeded (status is 0 or non-null)
        const output = (result.stdout || '') + (result.stderr || '');
        return {
          content: [{ type: 'text', text: `${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}` }],
          isError: false
        };
      } else {
        // Command failed (error is set or status is null means timeout/killed)
        let errorMessage = `Command failed`;
        if (result.error) {
          errorMessage += ` - ${result.error.message}`;
        }
        if (result.status !== null) {
          errorMessage += ` with exit code ${result.status}`;
        }
        return {
          content: [{ 
            type: 'text', 
            text: `${errorMessage}\n\nStderr: ${result.stderr || 'No error message'}\n\nStdout: ${result.stdout || 'No output'}` 
          }],
          isError: true
        };
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Error executing command: ${errorMsg}` }],
        isError: true
      };
    }
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const runTerminalCommandToolsManifest = [
  {
    id: 'run_terminal_command',
    name: 'Run Terminal Command',
    description: RUN_TERMINAL_COMMAND_DESC,
    params: runTerminalCommandSchemaFields,
  },
];
