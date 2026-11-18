/**
 * Form Management Routes (API v1 + legacy aliases)
 * Handles CRUD operations for forms
 */

import { FastifyInstance } from 'fastify';
import { formService } from '../server';
import { addValidationMiddleware } from '../middleware/validation';
import { FormSchema, FormSchemaOptions, SOCKET_EVENTS } from '../../shared/types';
import { addApiVersionHeaders, registerVersionedRoutes } from '../utils/api-version';

function parseIsActive(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }
  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }
  return undefined;
}

export default async (server: FastifyInstance) => {
  addValidationMiddleware(server);
  addApiVersionHeaders(server);

  registerVersionedRoutes(server, 'get', '/forms', async (request, reply) => {
    try {
      const query = request.query as Record<string, unknown>;
      const connector_id = query.connector_id ? Number(query.connector_id) : undefined;
      const limit = parseInt(String(query.limit ?? '50'), 10) || 50;
      const offset = parseInt(String(query.offset ?? '0'), 10) || 0;

      const formsResponse = await formService.getAllForms({
        dataConnecter: connector_id !== undefined && !Number.isNaN(connector_id)
          ? { id: connector_id }
          : undefined,
        is_active: parseIsActive(query.is_active),
        limit,
        offset,
      } as FormSchemaOptions);

      return formsResponse;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500);
      throw new Error(`Failed to list forms: ${message}`);
    }
  });

  registerVersionedRoutes(server, 'get', '/forms/:key', async (request, reply) => {
    try {
      const params = request.params as { key: string };
      const form = await formService.getFormByKey(params.key);

      if (!form) {
        return reply.status(404).send({ error: 'Not found' });
      }

      return form;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500);
      throw new Error(`Failed to get form: ${message}`);
    }
  });

  registerVersionedRoutes(server, 'post', '/forms', async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const formKey = (body.formKey ?? body.key) as string | undefined;

      if (!formKey || !body.name) {
        return reply.status(400).send({ error: 'Missing required fields (formKey/key and name)' });
      }

      const form = await formService.createForm({
        formKey,
        name: body.name as string,
        description: body.description as string | undefined,
        dataConnecter: body.dataConnecter as FormSchema['dataConnecter'],
        model: (body.model as FormSchema['model']) ?? undefined,
        components: (body.components as FormSchema['components']) ?? [],
        validationRules: body.validationRules as FormSchema['validationRules'],
        columns: body.columns as FormSchema['columns'],
        formActions: body.formActions as FormSchema['formActions'],
        is_active: body.is_active as boolean | undefined,
      });

      server.io?.emit(SOCKET_EVENTS.FORM_CREATED, {
        form,
        message: 'Form created successfully',
      });

      return reply.status(201).send(form);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500);
      throw new Error(`Failed to create form: ${message}`);
    }
  });

  registerVersionedRoutes(server, 'put', '/forms/:key', async (request, reply) => {
    try {
      const params = request.params as { key: string };
      const body = request.body as Record<string, unknown>;

      if (!body) {
        return reply.status(400).send({ error: 'Missing request body' });
      }

      const updateData: Record<string, unknown> = {};
      if (body.formKey !== undefined || body.key !== undefined) {
        updateData.formKey = body.formKey ?? body.key;
      }
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.dataConnecter !== undefined) updateData.dataConnecter = body.dataConnecter;
      if (body.model !== undefined) updateData.model = body.model;
      if (body.columns !== undefined) updateData.columns = body.columns;
      if (body.formActions !== undefined) updateData.formActions = body.formActions;
      if (body.components !== undefined) updateData.components = body.components;
      if (body.validationRules !== undefined) updateData.validationRules = body.validationRules;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;

      const form = await formService.updateFormByKey(params.key, updateData);

      if (!form) {
        return reply.status(404).send({ error: 'Not found' });
      }

      server.io?.emit(SOCKET_EVENTS.FORM_UPDATED, {
        form,
        message: 'Form updated successfully',
      });

      return form;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500);
      throw new Error(`Failed to update form: ${message}`);
    }
  });

  registerVersionedRoutes(server, 'delete', '/forms/:key', async (request, reply) => {
    try {
      const params = request.params as { key: string };
      const deleted = await formService.deleteFormByKey(params.key);

      if (!deleted) {
        return reply.status(404).send({ error: 'Not found' });
      }

      server.io?.emit(SOCKET_EVENTS.FORM_DELETED, {
        key: params.key,
        message: 'Form deleted successfully',
      });

      return {
        success: true,
        message: 'Form deleted successfully',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500);
      throw new Error(`Failed to delete form: ${message}`);
    }
  });

  registerVersionedRoutes(server, 'post', '/forms/:key/refresh', async (request, reply) => {
    try {
      const params = request.params as { key: string };
      const result = await formService.refreshFormModel(params.key);

      if (!result) {
        return reply.status(400).send({ error: 'Unable to refresh model' });
      }

      server.io?.emit(SOCKET_EVENTS.FORM_UPDATED, {
        key: params.key,
        result,
        message: 'Form model refreshed successfully',
      });

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      reply.code(500);
      throw new Error(`Failed to refresh form model: ${message}`);
    }
  });
};
