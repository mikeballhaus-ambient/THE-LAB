import { z } from 'zod';

/**
 * Schema for Remove Directory MCP tool parameters
 */
export const removeDirectorySchemaFields = z.object({
  path: z.string().describe('Filesystem path of the directory to remove. Must be a valid path string.'),
  recursive: z.boolean().default(true).describe('If true, removes all contents recursively. Defaults to `true`.'),
  force: z.boolean().default(false).describe('If true, forces deletion even if the directory is not empty. Defaults to `false`.'),
});

export type RemoveDirectoryParamsSchema = z.infer<typeof removeDirectorySchemaFields>;
