import { z } from 'zod';

// Search Repository schema for tool parameters
export const searchRepositorySchemaFields = z.object({
  path: z.string().describe('Directory path relative to project root (default: ".")'),
  regex: z.string().describe('JavaScript regex pattern for matching'),
  file_pattern: z.string().optional().describe('Glob pattern to filter file types (e.g., "*.ts", "*.ts,*.tsx", "*.{ts,tsx,vue}")'),
  match_case: z.boolean().optional().describe('Set true for case-sensitive matching (default: false)')
});
