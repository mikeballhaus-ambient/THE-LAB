import { z } from 'zod';

export const resolveLibrarySchemaFields = z.object({
  libraryName: z.string().describe('The name of the library to search for. Required for context7_resolve_library_id.'),
  resolveQuery: z.string().describe('The question or task for relevance ranking. Required for context7_resolve_library_id.'),
});

export const queryDocsSchemaFields = z.object({
  libraryId: z.string().describe('The resolved Context7 unique library reference ID (e.g., "/mongodb/docs")'),
  docsQuery: z.string().describe('The technical documentation lookup question or code snippet request context')
});
