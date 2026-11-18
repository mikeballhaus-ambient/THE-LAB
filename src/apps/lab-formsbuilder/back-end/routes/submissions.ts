/**
 * Form submission read routes (API v1 + legacy aliases)
 */

import { FastifyInstance } from 'fastify';
import { submissionService } from '../server';
import { addApiVersionHeaders, registerVersionedRoutes } from '../utils/api-version';

export default async (server: FastifyInstance) => {
  addApiVersionHeaders(server);

  registerVersionedRoutes(server, 'get', '/submissions', async (request, reply) => {
    try {
      const query = request.query as { formKey?: string; limit?: string; offset?: string };
      const limit = parseInt(query.limit ?? '50', 10);
      const offset = parseInt(query.offset ?? '0', 10);

      const result = await submissionService.getAllSubmissions({
        formKey: query.formKey,
        limit,
        offset,
      });

      return {
        submissions: result.formSubmissions,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500);
      throw new Error(`Failed to list submissions: ${message}`);
    }
  });
};
