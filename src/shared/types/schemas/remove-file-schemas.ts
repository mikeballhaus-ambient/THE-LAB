import { z } from 'zod';

// ==========================================
// Remove File Schema
// ==========================================
export const removeFileSchemaFields = z.object({
  path: z.string().describe('Filesystem path of the file or directory to remove. Must be a valid path string.'),
  recursive: z.boolean().default(false).describe('If true, removes directories recursively. Defaults to `false`.'),
  force: z.boolean().default(false).describe('If true, forces deletion even if the directory is not empty. Defaults to `false`.')
});
