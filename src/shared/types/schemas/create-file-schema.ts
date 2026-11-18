import { z } from 'zod';

export const createFileSchemaFields = z.object({
  path: z.string().describe('The filesystem path to create the file at. Can be absolute or relative.'),
  content: z.string().default('').describe('The content to write into the file. Should not contain literal newlines.'),
  overwrite: z.boolean().default(false).describe('If true, overwrites existing file. Defaults to false (fails if file exists).'),
  ensureDir: z.boolean().default(false).describe('If true, creates parent directories if they do not exist. Defaults to false.')
});
