import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requirePlatformOwnerOrAdmin } from '../middleware/platform-http-auth';
import { oidcProviderService } from '../db/OidcProviders/oidc-provider-service';
import type { LabOidcProviderSettingsUpdate } from '@/shared/types/oidc-provider-settings';

export function registerPlatformOidcProviderRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/oidc-providers',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const payload = oidcProviderService.getAdminPayload();
      return reply.send({
        success: true,
        data: payload.providers,
      });
    },
  );

  server.put(
    '/api/platform/oidc-providers/:providerId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['enabled', 'clientId'],
          properties: {
            enabled: { type: 'boolean' },
            clientId: { type: 'string' },
            clientSecret: { type: 'string' },
            redirectUri: { type: 'string' },
            tenantId: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { providerId: string };
        Body: LabOidcProviderSettingsUpdate;
      }>,
      reply: FastifyReply,
    ) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const result = oidcProviderService.updateProviderSettings(
        request.params.providerId,
        request.body,
      );
      if (!result.success) {
        return reply.status(400).send({ success: false, error: result.error });
      }
      return reply.send({ success: true, data: result.settings });
    },
  );

  server.get(
    '/api/platform/oidc-providers/:providerId/client-secret',
    async (
      request: FastifyRequest<{ Params: { providerId: string } }>,
      reply: FastifyReply,
    ) => {
      const caller = await requirePlatformOwnerOrAdmin(request, reply);
      if (!caller) {
        return;
      }
      const secret = oidcProviderService.getProviderClientSecret(
        request.params.providerId,
      );
      if (!secret) {
        return reply.status(404).send({
          success: false,
          error: 'No client secret is stored for this provider.',
        });
      }
      return reply.send({ success: true, data: { clientSecret: secret } });
    },
  );
}
