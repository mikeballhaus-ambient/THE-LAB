import { z } from 'zod';

// ==========================================
// Get Line Content Schema
// ==========================================
export const getLineContentSchemaFields = z.object({
  path: z.string().describe('Filesystem path of the file to read. Must be a valid path string.'),
  line: z.number().int().positive().describe('1-based line number to retrieve for get_line_content operation')
});

// ==========================================
// Get Diff Template Schema
// ==========================================
export const getDiffTemplateSchemaFields = z.object({
  path: z.string().describe('Filesystem path of the file to read. Must be a valid path string.'),
  start_line: z.number().int().positive().describe('1-based starting line for get_diff_template range'),
  end_line: z.number().int().positive().describe('1-based ending line for get_diff_template range (must be >= start_line)')
});

// ==========================================
// Diff Schema Fields
// ==========================================
export const diffSchemaFields = z.object({
  start_line: z.number().int().positive().describe("1-based line number where the patch will be applied"),
  original: z.string().optional().describe('The exact text expected at the target location'),
  updated: z.string().describe('The new text to insert or replace'),
  is_additive: z.boolean().optional().describe('When true, inserts without removing existing content')
});

export type diffSchemaFieldsSchema = z.infer<typeof diffSchemaFields>;

// Type alias for ApplyPatchResult parameter (matches diffSchemaFields)
export type DiffPatch = z.infer<typeof diffSchemaFields>;

// ==========================================
// Update File Schema
// ==========================================
export const updateFileSchemaFields = z.object({
  path: z.string().describe('Filesystem path of the file to update. Must point to an existing file.'),
  diffs: z.array(diffSchemaFields).min(1).describe('Array of patch objects. Each patch specifies line changes with original and updated content.')
});

export type updateFileSchemaFieldsSchema = z.infer<typeof updateFileSchemaFields>;
