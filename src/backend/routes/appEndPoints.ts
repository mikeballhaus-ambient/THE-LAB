import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { AppManager } from "../AppManager";
import { PersonaManagerUtils } from "../mcp/mcp-servers/persona/utils/persona-manager-utils";
import { AwaiterUtils } from "../mcp/mcp-servers/awaiter/utils/awaiter-utils";
import { registerPlatformUserRoutes } from './platformUserRoutes';
import { registerLabVirtualBankRoutes } from './labVirtualBankRoutes';
import { registerPlatformOidcProviderRoutes } from './platform-oidc-provider-routes';
import { registerPlatformAppServerRoutes } from './platformAppServerRoutes';
import { registerPlatformAppSeedDataRoutes } from './platform-app-seed-data';
import { registerPlatformThemeRoutes } from './platform-theme-routes';
import { registerPlatformLlmRoutes } from './platformLlmRoutes';
import { registerPlatformCommsRoutes } from './platformCommsRoutes';
import { registerPlatformAppOrderRoutes } from './platformAppOrderRoutes';
import { registerPlatformAppTagsRoutes } from './platform-app-tags-routes';
import { registerPlatformLabSidecarActivityRoutes } from './platform-lab-sidecar-activity-routes';
import { registerPlatformLabEventsRoutes } from './platform-lab-events-routes';
import { registerPlatformLabRulesRoutes } from './platform-lab-rules-routes';
import { registerPlatformLabWorkflowsRoutes } from './platform-lab-workflows-routes';
import { registerPlatformLabApprovalsRoutes } from './platform-lab-approvals-routes';
import { registerPlatformLabLedgerRoutes } from './platform-lab-ledger-routes';
import { registerPlatformLabIntegrationsRoutes } from './platform-lab-integrations-routes';
import { registerPlatformWorkflowHooksRoutes } from './platform-workflow-hooks-routes';
import { registerWorkflowWebhookTriggerRoutes } from './workflow-webhook-trigger-routes';
import { registerPlatformLabWebhooksRoutes } from './platform-lab-webhooks-routes';
import { registerPlatformIntegrationConnectorRoutes } from './platform-integration-connector-routes';
import { registerPlatformCatalogLookupRoutes } from './platform-catalog-lookup-routes';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';

declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }
}

export interface LaunchAppRequest {
  id: string;
  entry: string;
  port: number;
  userId?: number;
}

export interface TeardownAppRequest {
  id: string;
  port: number;
  userId?: number;
}

export function initEndPoints(server: FastifyInstance, appManager: AppManager): void {

  registerPlatformUserRoutes(server);
  registerLabVirtualBankRoutes(server);
  registerPlatformOidcProviderRoutes(server);
  registerPlatformAppServerRoutes(server, appManager);
  registerPlatformAppSeedDataRoutes(server, appManager);
  registerPlatformThemeRoutes(server);
  registerPlatformLlmRoutes(server);
  registerPlatformCommsRoutes(server);
  registerPlatformAppOrderRoutes(server);
  registerPlatformAppTagsRoutes(server);
  registerPlatformLabSidecarActivityRoutes(server);
  registerPlatformLabEventsRoutes(server);
  registerPlatformLabRulesRoutes(server);
  registerPlatformLabWorkflowsRoutes(server);
  registerPlatformLabApprovalsRoutes(server);
  registerPlatformLabLedgerRoutes(server);
  registerPlatformLabIntegrationsRoutes(server);
  registerPlatformWorkflowHooksRoutes(server);
  // Dedicated webhook-trigger base URL (phase 37): `/api/hooks/workflows/:slug/:secret`, where the
  // secret decides test-vs-live rather than a segment the caller could edit.
  registerWorkflowWebhookTriggerRoutes(server);
  registerPlatformLabWebhooksRoutes(server);
  registerPlatformIntegrationConnectorRoutes(server);
  registerPlatformCatalogLookupRoutes(server);
  AwaiterUtils.initAwaiterEndpoint(server)
  PersonaManagerUtils.initPersonaManagerEndpoints(server)

  server.post('/app/launch', {
    preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
    schema: {
      body: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          entry: { type: 'string' },
          port: { type: 'number' },
          userId: { type: 'number' },
        },
        required: ['id', 'port'],
      },
    },
  }, async (request: FastifyRequest<{ Body: LaunchAppRequest }>, reply: FastifyReply) => {
    try {
      const labUser = (request as FastifyRequest & { labUser?: { userId: number } }).labUser;
      const { id, entry, port } = request.body;
      const userId = labUser?.userId;
      if (!id || !entry || !port || !userId) {
        return reply.status(400).send({ error: 'App ID, entry, port, and authenticated user are required' });
      }
      if (request.body.userId != null && request.body.userId !== userId) {
        return reply.status(403).send({ error: 'userId in body does not match authenticated user' });
      }
      const launchSuccess = await appManager.launchServerApp(id, entry, port, userId);
      return launchSuccess ?
        reply.status(200).send({ success: true, message: `App ${id} launched successfully` }) :
        reply.status(200).send({ success: false, message: `App ${id} did not launched successfully` });
    } catch (error: unknown) {
      server.log.error(`[App SVC]: Failed to launch App: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(500).send({
        error: 'Failed to launch App',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  server.post('/app/teardown', {
    preHandler: (request, reply) => requirePlatformHttpUser(request, reply),
    schema: {
      body: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          port: { type: 'number' },
          userId: { type: 'number' },
        },
        required: ['id', 'port'],
      },
    },
  }, async (request: FastifyRequest<{ Body: TeardownAppRequest }>, reply: FastifyReply) => {
    try {
      const labUser = (request as FastifyRequest & { labUser?: { userId: number } }).labUser;
      const { id, port } = request.body;
      const userId = labUser?.userId;
      if (!id || !port || !userId) {
        return reply.status(400).send({ error: 'App ID, port, and authenticated user are required' });
      }
      if (request.body.userId != null && request.body.userId !== userId) {
        return reply.status(403).send({ error: 'userId in body does not match authenticated user' });
      }
      await appManager.teardownServerApp(id, port, userId);
      const shared = process.env.APP_SERVER_ALLOW_KILL !== '1';
      return reply.status(200).send({
        success: true,
        sharedServer: shared,
        message: shared
          ? `App ${id} UI session closed; shared server on port ${port} was not stopped`
          : `App ${id} torn down successfully`,
      });
    } catch (error: unknown) {
      server.log.error(`Failed to tear down App: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(500).send({
        error: 'Failed to tear down App',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });
}