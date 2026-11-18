import { z } from 'zod';

/**
 * Schema for Run Terminal Command MCP tool parameters
 */
export const runTerminalCommandSchemaFields = z.object({
  command: z.string().describe('Shell command to execute in current working directory. Required parameter.'),
  timeout: z.number().default(30000).describe('Maximum execution time in milliseconds; defaults to 30000ms (30s)')
});

export type RunTerminalCommandParamsSchema = z.infer<typeof runTerminalCommandSchemaFields>;
