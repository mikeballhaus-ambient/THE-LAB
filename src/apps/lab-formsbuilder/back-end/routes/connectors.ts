/**
 * Connector Management Routes (API v1)
 * Handles CRUD operations for data connectors
 */

import { FastifyInstance } from 'fastify';
import { connectorService } from '../server';
import { addValidationMiddleware } from '../middleware/validation';
import { DataConnector, SOCKET_EVENTS } from '../../shared/types';
import { addApiVersionHeaders, registerVersionedRoutes } from '../utils/api-version';

type ConnectorIdParams = { id: string };

type ConnectorRegisterBody = {
  discovery_url?: string;
  app_name?: string;
  entity_name?: string;
  discovery_type?: string;
  is_active?: number;
  endpoints?: unknown;
  capabilities?: unknown;
};

type ConnectorUpdateBody = Record<string, unknown>;

function connectorErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default async (server: FastifyInstance) => {
  // Apply validation middleware
  addValidationMiddleware(server);

  // Add API version headers to all responses
  addApiVersionHeaders(server);

  // ============================================================================
  // List All Connectors
  // ============================================================================

  registerVersionedRoutes(server, 'get', '/connectors', async (_request, reply) => {
    try {
      const connectors = await connectorService.getAllConnectors();

      return {
        connectors,
      };
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to list connectors: ${connectorErrorMessage(error)}`);
    }
  });

  // ============================================================================
  // Get Connector by ID
  // ============================================================================

  registerVersionedRoutes(server, 'get', '/connectors/:id', async (_request, reply) => {
    try {
      const params = _request.params as ConnectorIdParams;
      const id = parseInt(params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid connector ID' });
      }

      const connector = await connectorService.getConnectorById(id);

      if (!connector) {
        return reply.status(404).send({ error: 'Connector not found' });
      }

      return connector;
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to get connector: ${connectorErrorMessage(error)}`);
    }
  });

  // ============================================================================
  // Preview Discovery Contract (no save)
  // ============================================================================

  registerVersionedRoutes(server, 'post', '/connectors/preview', async (_request, reply) => {
    try {
      const body = _request.body as { discovery_url?: string };

      if (!body.discovery_url) {
        return reply.status(400).send({ error: 'discovery_url is required' });
      }

      const preview = await connectorService.previewDiscovery(body.discovery_url);

      if (!preview) {
        return reply.status(400).send({
          error: 'Could not validate discovery URL. Ensure the endpoint returns a valid FormsBuilderContract.',
        });
      }

      return preview;
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to preview discovery: ${connectorErrorMessage(error)}`);
    }
  });

  // ============================================================================
  // Register New Connector (Admin)
  // ============================================================================

  registerVersionedRoutes(server, 'post', '/connectors', async (_request, reply) => {
    try {
      const body = _request.body as ConnectorRegisterBody;

      if (!body.discovery_url) {
        return reply.status(400).send({ error: 'discovery_url is required' });
      }

      const connector = await connectorService.registerConnector({
        appName: body.app_name,
        entityName: body.entity_name,
        discoveryUrl: body.discovery_url,
        discoveryType: body.discovery_type,
        is_active: body.is_active,
        endpoints: body.endpoints,
        capabilities: body.capabilities,
      } as DataConnector);

      if (!connector) {
        return reply.status(400).send({
          error: 'Could not register connector. Check that the discovery URL is reachable and returns a valid contract.',
        });
      }

      // Emit WebSocket event for real-time updates
      server.io?.emit(SOCKET_EVENTS.CONNECTOR_VERIFIED, {
        connector,
        message: 'Connector registered successfully',
      });

      return reply.status(201).send(connector);
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to register connector: ${connectorErrorMessage(error)}`);
    }
  });

  // ============================================================================
  // Update Connector (Admin)
  // ============================================================================

  registerVersionedRoutes(server, 'put', '/connectors/:id', async (_request, reply) => {
    try {
      const params = _request.params as ConnectorIdParams;
      const id = parseInt(params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid connector ID' });
      }

      const body = _request.body as ConnectorUpdateBody;

      if (!body) {
        return reply.status(400).send({ error: 'Missing request body' });
      }

      const updateData: Partial<DataConnector> = {};
      if (typeof body.app_name === 'string') updateData.appName = body.app_name;
      if (typeof body.entity_name === 'string') updateData.entityName = body.entity_name;
      if (typeof body.discovery_url === 'string') updateData.discoveryUrl = body.discovery_url;
      if (typeof body.discovery_type === 'string') updateData.discoveryType = body.discovery_type;
      if (typeof body.is_active === 'number') updateData.is_active = body.is_active;
      if (body.endpoints !== undefined) updateData.endpoints = body.endpoints as DataConnector['endpoints'];
      if (body.endpoint !== undefined) updateData.endpoints = body.endpoint as DataConnector['endpoints'];
      if (Array.isArray(body.capabilities)) {
        updateData.capabilities = body.capabilities as DataConnector['capabilities'];
      }
      if (typeof body.last_verified_at === 'string') updateData.last_verified_at = body.last_verified_at;

      const connector = await connectorService.updateConnector(id, updateData);

      if (!connector) {
        return reply.status(404).send({ error: 'Connector not found' });
      }

      // Emit WebSocket event for real-time updates
      server.io?.emit(SOCKET_EVENTS.CONNECTOR_VERIFIED, {
        connector,
        message: 'Connector updated successfully',
      });

      return connector;
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to update connector: ${connectorErrorMessage(error)}`);
    }
  });

  // ============================================================================
  // Delete Connector (Admin)
  // ============================================================================

  registerVersionedRoutes(server, 'delete', '/connectors/:id', async (_request, reply) => {
    try {
      const params = _request.params as ConnectorIdParams;
      const id = parseInt(params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid connector ID' });
      }

      const deleted = await connectorService.deleteConnector(id);

      if (!deleted) {
        return reply.status(404).send({ error: 'Connector not found' });
      }

      // Emit WebSocket event for real-time updates
      server.io?.emit(SOCKET_EVENTS.CONNECTOR_VERIFIED, {
        id,
        message: 'Connector deleted successfully',
      });

      return {
        success: true,
        message: 'Connector deleted successfully',
      };
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to delete connector: ${connectorErrorMessage(error)}`);
    }
  });

  // ============================================================================
  // Verify Connector Contract
  // ============================================================================

  registerVersionedRoutes(server, 'post', '/connectors/:id/verify', async (_request, reply) => {
    try {
      const params = _request.params as ConnectorIdParams;
      const id = parseInt(params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid connector ID' });
      }

      const result = await connectorService.verifyConnector(id);

      if (!result) {
        return reply.status(400).send('Unable to validate connector');
      }

      // Emit WebSocket event for real-time updates
      server.io?.emit(SOCKET_EVENTS.CONNECTOR_VERIFIED, {
        id,
        contract: result,
        message: result ? 'Connector contract verified successfully' : 'Unable to validate connector',
      });

      return result;
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to verify connector: ${connectorErrorMessage(error)}`);
    }
  });

  // ============================================================================
  // Verify Discovery URL (NEW - for new connectors being configured)
  // ============================================================================

  registerVersionedRoutes(server, 'post', '/connectors/:id/verify-discovery', async (_request, reply) => {
    try {
      const params = _request.params as ConnectorIdParams;
      const id = parseInt(params.id, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid connector ID' });
      }

      // Get connector info
      const connector = await connectorService.getConnectorById(id);

      if (!connector) {
        return reply.status(404).send({ error: 'Connector not found' });
      }

      // Verify discovery URL without saving to database
      const result = await connectorService.verifyConnectorConnection(connector, true);

      if (!result) {
        return reply.status(400).send({ error: 'Unable to validate discovery URL' });
      }

      // Emit WebSocket event for real-time updates
      server.io?.emit(SOCKET_EVENTS.CONNECTOR_VERIFIED, {
        connector: result,
        message: 'Discovery URL verified successfully',
      });

      return reply.status(200).send({ success: true, connector: result });
    } catch (error: unknown) {
      reply.code(500);
      throw new Error(`Failed to verify discovery URL: ${connectorErrorMessage(error)}`);
    }
  });
}
