import { z } from 'zod';

// Web Query schema for tool parameters
export const webQuerySchemaFields = z.object({
  query: z.string().describe('The search query to perform on the web.'),
  max_results: z.number().max(10).default(5).optional().describe('The maximum number of results to return. Defaults to 5.')
});
