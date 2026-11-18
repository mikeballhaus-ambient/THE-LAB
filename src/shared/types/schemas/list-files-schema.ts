import { z } from 'zod';

export const ListFilesParamsSchema = z.object({
  path: z.string().default('.').describe('The filesystem path to list files from. Defaults to current directory (`.`).'),
  recursive: z.boolean().default(true).describe('If true, lists files recursively. Defaults to `true`.'),
  limit: z.number().int().positive().min(1).max(50).default(25).describe('Maximum number of files/directories to return. Range: 1-50. Default: 25.')
});
