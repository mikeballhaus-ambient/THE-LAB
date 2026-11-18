import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  getRequestCorrelation,
  newCorrelationId,
  runWithRequestCorrelation,
} from '../utils/request-correlation';

const CORRELATION_HEADER = 'x-lab-correlation-id';

export function registerRequestCorrelationMiddleware(server: FastifyInstance): void {
  server.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
    const incoming = request.headers[CORRELATION_HEADER];
    const correlationId =
      typeof incoming === 'string' && incoming.trim().length > 0
        ? incoming.trim()
        : newCorrelationId();
    reply.header(CORRELATION_HEADER, correlationId);
    runWithRequestCorrelation({ correlationId }, () => done());
  });

  server.addHook('preHandler', (request: FastifyRequest, _reply: FastifyReply, done) => {
    const ctx = getRequestCorrelation();
    if (ctx) {
      const sessionHeader = request.headers['x-lab-session-id'];
      if (typeof sessionHeader === 'string' && sessionHeader.trim()) {
        ctx.sessionId = sessionHeader.trim();
      }
    }
    done();
  });
}
