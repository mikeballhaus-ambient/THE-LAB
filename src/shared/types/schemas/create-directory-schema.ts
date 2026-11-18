import { z } from 'zod';

export const createDirectorySchemaFields = z.object({
  path: z.string().describe('Absolute or relative filesystem path where the directory will be created. Required for create-directory.'),
  recursive: z.boolean().default(true).describe('When true, auto-creates missing parent directories; when false, requires parents to exist. Default: true.')
});
