import { z } from 'zod';

// ==========================================
// Read File Schema
// ==========================================
export const readFileSchemaFields = z.object({
  path: z.string().describe('Filesystem path of the file to read. Must be a valid path string.'),
  offset: z.number().int().nonnegative().optional().default(0).describe('Line number to start reading from (1-based index). An offset of 0 is treated as line 1. Useful for pagination.'),
  limit: z.number().int().positive().optional().default(500).describe('Maximum number of lines to return. When omitted, returns all lines after offset. Default: 500 lines.'),
  typecheck: z.boolean().default(false).describe('If true, will return any current type checking errors.'),
  lint: z.boolean().default(false).describe('If true, will return any linting errors.')
});
