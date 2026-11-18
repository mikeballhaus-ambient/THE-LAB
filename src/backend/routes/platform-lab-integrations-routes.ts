import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import {
  LabIntegrationsError,
  canReadHostBindings,
  labIntegrationsService,
} from '../db/LabIntegrations/lab-integrations-service';
import { labIntegrationsHubService } from '../lab-integrations/lab-integrations-hub-service';
import { labIntegrationsFormStubProvisioner } from '../lab-integrations/lab-integrations-form-stub-provisioner';
import { labIntegrationsDependencyCoordinator } from '../lab-integrations/lab-integrations-dependency-coordinator';
import {
  parseProvisionChartStubRequest,
  parseProvisionFormStubRequest,
} from '@/shared/types/schemas/lab-integrations-stub-schema';
import { labIntegrationsChartStubProvisioner } from '../lab-integrations/lab-integrations-chart-stub-provisioner';
import { crmEntityIntegrationSyncService } from '../lab-integrations/crm-entity-integration-sync-service';
import { parseCrmIntegrationSyncRequest } from '@/shared/types/schemas/crm-integration-sync-schema';
import { fetchIntegrationRecord } from '../lab-workflows/lab-workflow-integration-connector-client';

declare module 'fastify' {
  interface FastifyRequest {
    labUser?: User;
  }
}

function mapError(reply: FastifyReply, err: unknown) {
  if (err instanceof LabIntegrationsError) {
    const status =
      err.code === 'NOT_FOUND'
        ? 404
        : err.code === 'FORBIDDEN'
          ? 403
          : err.code === 'CONFLICT'
            ? 409
            : 400;
    return reply.status(status).send({ success: false, error: err.code, message: err.message });
  }
  throw err;
}

export function registerPlatformLabIntegrationsRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/lab-integrations/bindings',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const hostAppId = (request.query as { hostAppId?: string }).hostAppId;
      if (!hostAppId) {
        return reply.status(400).send({ success: false, message: 'hostAppId query parameter is required' });
      }
      try {
        const bindings = labIntegrationsService.listBindingsForCaller(caller, hostAppId);
        return reply.send({ success: true, data: { bindings } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-integrations/bindings/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const binding = labIntegrationsService.getBindingForCaller(
          caller,
          (request.params as { id: string }).id,
        );
        return reply.send({ success: true, data: { binding } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-integrations/bindings',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const binding = await labIntegrationsService.createBindingForCaller(caller, request.body);
        return reply.send({ success: true, data: { binding } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.put(
    '/api/platform/lab-integrations/bindings/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const binding = await labIntegrationsService.updateBindingForCaller(
          caller,
          (request.params as { id: string }).id,
          request.body,
        );
        return reply.send({ success: true, data: { binding } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-integrations/manifest/:appId',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const manifest = labIntegrationsHubService.getManifestForCaller(
          caller,
          (request.params as { appId: string }).appId,
        );
        return reply.send({ success: true, data: { manifest } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-integrations/service-catalog',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const catalog = labIntegrationsHubService.listIntegrationServiceCatalogForCaller(caller);
        return reply.send({ success: true, data: catalog });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-integrations/hub/:appId/services',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const services = labIntegrationsHubService.listServicesForCaller(
          caller,
          (request.params as { appId: string }).appId,
        );
        return reply.send({ success: true, data: { services } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-integrations/launch-deps/:hostAppId',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const hostAppId = (request.params as { hostAppId: string }).hostAppId;
      try {
        if (!canReadHostBindings(caller, hostAppId)) {
          throw new LabIntegrationsError('Not allowed to read launch dependencies for this host', 'FORBIDDEN');
        }
        const dependencyAppIds = labIntegrationsDependencyCoordinator.getLaunchDependencyIds(hostAppId);
        return reply.send({ success: true, data: { dependencyAppIds } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-integrations/provision-chart-stub',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const body = parseProvisionChartStubRequest(request.body);
        const result = await labIntegrationsChartStubProvisioner.provisionForCaller(caller, body);
        return reply.send({ success: true, data: result });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-integrations/crm/sync-entities',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const body = parseCrmIntegrationSyncRequest(request.body);
        const result = await crmEntityIntegrationSyncService.syncForCaller(caller, body);
        return reply.send({ success: true, data: result });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.post(
    '/api/platform/lab-integrations/provision-form-stub',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const body = parseProvisionFormStubRequest(request.body);
        const result = await labIntegrationsFormStubProvisioner.provisionForCaller(caller, body);
        return reply.send({ success: true, data: result });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-integrations/hub/:appId/services/:serviceId/records/:recordId',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const { appId, serviceId, recordId } = request.params as {
        appId: string;
        serviceId: string;
        recordId: string;
      };
      try {
        const decodedId = decodeURIComponent(recordId);
        const asNumber = Number.parseInt(decodedId, 10);
        const id =
          !Number.isNaN(asNumber) && String(asNumber) === decodedId.trim() ? asNumber : decodedId;
        const record = await fetchIntegrationRecord(caller, appId, serviceId, id);
        if (!record) {
          return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
        }
        return reply.send({ success: true, data: { record } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.get(
    '/api/platform/lab-integrations/hub/:appId/services/:serviceId/discovery',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      const { appId, serviceId } = request.params as { appId: string; serviceId: string };
      try {
        const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
          caller,
          appId,
          serviceId,
        );
        return reply.send({ success: true, data: { contract } });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );

  server.delete(
    '/api/platform/lab-integrations/bindings/:id',
    { preHandler: (request, reply) => requirePlatformHttpUser(request, reply) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = request.labUser;
      if (!caller) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }
      try {
        const result = await labIntegrationsService.deleteBindingForCaller(
          caller,
          (request.params as { id: string }).id,
        );
        return reply.send({ success: true, ...result });
      } catch (err) {
        return mapError(reply, err);
      }
    },
  );
}
