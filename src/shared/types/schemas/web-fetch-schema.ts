import { z } from 'zod';

// Web Fetch schema for tool parameters
export const webFetchSchemaFields = z.object({
  url: z.string().describe('URL to fetch the content from. Must be a valid HTTP/HTTPS URL.')
});
