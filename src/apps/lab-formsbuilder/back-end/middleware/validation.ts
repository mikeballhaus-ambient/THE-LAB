/**
 * Validation Middleware - Provides input validation hooks for Fastify endpoints
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { isValidFormKey } from '@/shared/forms/form-key';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

function resolveFormKey(body: Record<string, unknown>): string | undefined {
  const raw = body.formKey ?? body.key;
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  return String(raw);
}

/**
 * POST /forms — API accepts `formKey` (client) or legacy `key`.
 */
export function createFormCreateValidator(): (
  request: FastifyRequest,
) => Promise<ValidationResult> {
  return async (_request: FastifyRequest): Promise<ValidationResult> => {
    const body = _request.body as Record<string, unknown>;
    const errors: string[] = [];

    if (!resolveFormKey(body)) {
      errors.push('Missing required field: formKey (or key)');
    }
    if (!body.name || body.name === '' || body.name === null) {
      errors.push('Missing required field: name');
    }

    return { valid: errors.length === 0, errors };
  };
}

/**
 * Create a validation hook for required fields.
 */
export function createRequiredFieldsValidator(fields: string[]): (request: FastifyRequest) => Promise<ValidationResult> {
  return async (_request: FastifyRequest): Promise<ValidationResult> => {
    const body = _request.body as Record<string, unknown>;
    const errors: string[] = [];

    for (const field of fields) {
      if (!body[field] || body[field] === '' || body[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

/**
 * Create a validation hook for numeric fields.
 */
export function createNumericFieldsValidator(fields: string[]): (request: FastifyRequest) => Promise<ValidationResult> {
  return async (_request: FastifyRequest): Promise<ValidationResult> => {
    const body = _request.body as Record<string, unknown>;
    const errors: string[] = [];

    for (const field of fields) {
      if (body[field] !== undefined && body[field] !== '' && body[field] !== null) {
        const value = body[field];
        if (typeof value !== 'number' && typeof value !== 'string') {
          errors.push(`Field ${field} must be a number or numeric string`);
        } else if (typeof value === 'string' && isNaN(Number(value))) {
          errors.push(`Field ${field} is not a valid number: ${value}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

/**
 * Create a validation hook for string fields with length constraints.
 */
export function createStringFieldsValidator(
  fieldConfigs: Array<{ name: string; minLength?: number; maxLength?: number }>,
): (request: FastifyRequest) => Promise<ValidationResult> {
  return async (_request: FastifyRequest): Promise<ValidationResult> => {
    const body = _request.body as Record<string, unknown>;
    const errors: string[] = [];

    for (const fieldConfig of fieldConfigs) {
      const fieldName = fieldConfig.name;
      const value = body[fieldName];
      
      if (value !== undefined && value !== '' && value !== null) {
        const strValue = String(value);
        
        if (fieldConfig.minLength !== undefined && strValue.length < fieldConfig.minLength) {
          errors.push(`Field ${fieldName} must be at least ${fieldConfig.minLength} characters`);
        }

        if (fieldConfig.maxLength !== undefined && strValue.length > fieldConfig.maxLength) {
          errors.push(`Field ${fieldName} must be at most ${fieldConfig.maxLength} characters`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

/**
 * Add validation hooks to a Fastify server instance.
 */
export function addValidationMiddleware(server: FastifyInstance) {
  const formCreateValidator = createFormCreateValidator();

  // Numeric fields validator for connector_id
  const numericFieldsValidator = createNumericFieldsValidator(['connector_id']);

  const formUpdateStringValidator = createStringFieldsValidator([
    { name: 'formKey', minLength: 1, maxLength: 255 },
    { name: 'key', minLength: 1, maxLength: 255 },
    { name: 'name', minLength: 1, maxLength: 255 },
    { name: 'description', minLength: 0, maxLength: 1000 },
  ]);

  // Register validation hooks for form endpoints
  server.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];
    const routePath = path.replace(/^\/api\/v1/, '') || path;

    if ((routePath === '/forms' || path.endsWith('/forms')) && request.method === 'POST') {
      const validationResult: ValidationResult = await formCreateValidator(request);
      if (!validationResult.valid) {
        return reply.status(400).send({ error: 'Validation failed', details: validationResult.errors });
      }

      const body = request.body as Record<string, unknown>;
      const formKey = resolveFormKey(body);
      if (formKey && !isValidFormKey(formKey)) {
        return reply.status(400).send({ error: 'Validation failed', details: ['Invalid form key format'] });
      }
    }

    if (routePath.startsWith('/forms/') && request.method === 'PUT') {
      const pathParts = routePath.split('/');
      const key = pathParts[2];

      // Validate form key format
      if (!isValidFormKey(key)) {
        return reply.status(400).send({ error: 'Invalid form key format' });
      }

      // Validate string fields
      const validationResult: ValidationResult = await formUpdateStringValidator(request);
      if (!validationResult.valid) {
        return reply.status(400).send({ error: 'Validation failed', details: validationResult.errors });
      }
    }

    if (routePath === '/connectors/preview' && request.method === 'POST') {
      const validator = createRequiredFieldsValidator(['discovery_url']);
      const validationResult: ValidationResult = await validator(request);
      if (!validationResult.valid) {
        return reply.status(400).send({ error: 'Validation failed', details: validationResult.errors });
      }

      const body = request.body as Record<string, unknown>;
      const url = body.discovery_url;
      if (url && typeof url === 'string' && !/^https?:\/\//.test(url)) {
        return reply.status(400).send({ error: 'Discovery URL must start with http:// or https://' });
      }
    }

    if (routePath === '/connectors' && request.method === 'POST') {
      const validator = createRequiredFieldsValidator(['discovery_url']);
      const validationResult: ValidationResult = await validator(request);
      if (!validationResult.valid) {
        return reply.status(400).send({ error: 'Validation failed', details: validationResult.errors });
      }

      // Validate discovery URL format
      const body = request.body as Record<string, unknown>;
      const url = body.discovery_url;
      if (url && typeof url === 'string' && !/^https?:\/\//.test(url)) {
        return reply.status(400).send({ error: 'Discovery URL must start with http:// or https://' });
      }

      // Validate connector_id is numeric
      const connectorId = body.connector_id;
      if (connectorId !== undefined && connectorId !== null) {
        const numericResult: ValidationResult = await numericFieldsValidator(request);
        if (!numericResult.valid) {
          return reply.status(400).send({ error: 'Validation failed', details: numericResult.errors });
        }
      }
    }

    if (routePath.startsWith('/connectors/') && request.method === 'PUT') {
      const pathParts = routePath.split('/');
      const id = parseInt(pathParts[2], 10);

      // Validate connector ID is numeric
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid connector ID' });
      }

      // Validate string fields
      const validator = createStringFieldsValidator([
        { name: 'app_name', minLength: 1, maxLength: 255 },
        { name: 'entity_name', minLength: 1, maxLength: 255 },
        { name: 'discovery_url', minLength: 0, maxLength: 2048 },
      ]);
      const validationResult: ValidationResult = await validator(request);
      if (!validationResult.valid) {
        return reply.status(400).send({ error: 'Validation failed', details: validationResult.errors });
      }
    }

    return {};
  });
}
