import type { FastifyInstance } from 'fastify';
import { LeadConvertService } from '../services/lead-convert-service';

export default async function leadRoutes(fastify: FastifyInstance) {
  const convertService = LeadConvertService.getInstance();

  fastify.post('/leads/:id/convert', async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    if (Number.isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid lead id' });
    }
    const body = (request.body ?? {}) as { saleData?: Record<string, unknown> };
    const result = await convertService.convertLead(id, body.saleData ?? {});
    if ('error' in result) {
      return reply.status(result.status).send({ error: result.error });
    }
    return result;
  });
}
