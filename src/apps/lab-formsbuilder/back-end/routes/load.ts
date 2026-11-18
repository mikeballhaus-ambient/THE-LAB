/**
 * Form Loading Routes
 * Provides form data for mounting in consuming apps
 */

import { FastifyInstance, type FastifyReply, type FastifyRequest, type RouteHandlerMethod } from 'fastify';
import { formService, submissionService } from '../server';
import { registerVersionedRoutes } from '../utils/api-version';
import { executeCrudAction } from '../utils/crud-proxy';
import type { FormsBuilderContract } from '@/shared/types';
import { enforceFormsPublicSubmitRateLimit } from '@/shared/server/forms-public-rate-limit';

function connectorForwardHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = request.headers.authorization;
  if (auth) {
    headers.Authorization = Array.isArray(auth) ? auth[0] : auth;
  }
  const hostApp = request.headers['x-host-app-id'];
  if (hostApp) {
    headers['X-Host-App-Id'] = Array.isArray(hostApp) ? hostApp[0] : hostApp;
  }
  return headers;
}

export default async (server: FastifyInstance) => {

  const loadHandler: RouteHandlerMethod = async (request, reply) => {
    try {
      const key = (request.params as { key?: string }).key;
      if (!key) {
        return reply.status(400).send({ error: 'Missing form key' });
      }

      const form = await formService.getFormByKey(key);

      if (!form) {
        return reply.status(404).send({ error: 'Form not found' });
      }

      return form;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.status(500);
      throw new Error(`Failed to load form: ${message}`);
    }
  };

  registerVersionedRoutes(server, 'get', '/forms/load/:key', loadHandler);

  const submitHandler: RouteHandlerMethod = async (request, reply) => {
    try {
      if (!(await enforceFormsPublicSubmitRateLimit(request as FastifyRequest, reply as FastifyReply))) {
        return;
      }
      const key = (request.params as { key?: string }).key;
      const body = request.body as { data?: Record<string, unknown> };

      if (!key || !body?.data) {
        return reply.status(400).send({ error: 'Missing form data' });
      }

      const form = await formService.getFormByKey(key);

      if (!form) {
        return reply.status(404).send({ error: 'Form not found' });
      }

      if (!form.dataConnecter) {
        return reply.status(400).send({
          error: 'Form is not connected to a data connector',
          message: 'Cannot submit form without a connected data connector',
        });
      }

      const connector = form.dataConnecter;
      const endpoints = connector.endpoints as FormsBuilderContract['endpoints'] | null | undefined;
      const baseUrl = endpoints?.baseUrl;

      if (!baseUrl || !endpoints?.crud) {
        return reply.status(400).send({ error: 'Connector missing CRUD endpoints' });
      }

      const recordId = body.data.id;
      const isUpdate = recordId !== undefined && recordId !== null && recordId !== '';

      try {
        const action = isUpdate ? endpoints.crud.update : endpoints.crud.create;
        const pathParams = isUpdate ? { id: String(recordId) } : undefined;
        const payload = isUpdate ? body.data : body.data;

        const forwardHeaders = connectorForwardHeaders(request as FastifyRequest);
        const { status, data: connectorResponse } = await executeCrudAction(
          baseUrl,
          action,
          payload,
          pathParams,
          Object.keys(forwardHeaders).length > 0 ? forwardHeaders : undefined,
        );

        const success = status >= 200 && status < 300;

        await submissionService.createSubmission({
          formKey: key,
          data_connector_id: connector.id,
          data: JSON.stringify(body.data),
          status: success ? 'submitted' : 'pending',
        });

        if (!success) {
          return reply.status(status).send({
            success: false,
            error: 'Connector rejected submission',
            connectorResponse,
          });
        }

        const responseRecord = connectorResponse as { id?: unknown };
        return {
          success: true,
          submissionId: responseRecord?.id ?? null,
          connectorResponse,
          message: 'Form submitted successfully',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({
          success: false,
          error: `Failed to submit form to connector: ${message}`,
          message: 'Form submission failed',
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.status(500);
      throw new Error(`Failed to submit form: ${message}`);
    }
  };

  registerVersionedRoutes(server, 'post', '/forms/submit/:key', submitHandler);
};
