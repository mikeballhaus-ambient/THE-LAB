import { z } from 'zod';

/**
 * Schema for Awaiter MCP tool parameters
 */
export const awaiterSchemaFields = z.object({
  userId: z.number()
    .describe('REQUIRED Obtained from System Instructions {{userId}} context. Agents must use the EXACT value provided in System Instructions. Do NOT generate or substitute a different userId.'),
  sessionId: z.string()
    .describe('REQUIRED Obtained from System Instructions {{sessionId}} context. Agents must use the EXACT value provided in System Instructions. Do NOT generate or substitute a different sessionId.'),
  persona: z.string()
    .describe('REQUIRED Your current persona. Valid values: Chat, Orchestrator, Architect, Code, Debug, QA (or any user-created persona)'),
  waitForSeconds: z.number()
    .describe('REQUIRED The time in seconds to await'),
  context: z.string()
    .describe('REQUIRED The context information that will be provided to the agent when the await has completed'),
});

export type AwaiterParamsSchema = z.infer<typeof awaiterSchemaFields>;
