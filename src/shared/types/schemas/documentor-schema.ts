import { z } from 'zod';

export const saveDocumentSchemaFields = z.object({
  path: z.string().describe('Filesystem path of the markdown file. Must end with .md extension.'),
  content: z.string().describe('Markdown content to save. Required for save_document operation.'),
  overwrite: z.boolean().default(false).describe('If true, allows overwriting existing files during save_document. Defaults to false.'),
});

export type SaveDocumentParams = z.infer<typeof saveDocumentSchemaFields>;