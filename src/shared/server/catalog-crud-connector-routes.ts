import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';

export interface CatalogLookupOption {
  id: string | number;
  value: string;
  label: string;
}

/** Route param for connector CRUD — numeric row ids or string keys (e.g. Chart Builder `chartKey`). */
export type ConnectorRouteId = string | number;

/**
 * Parse `:id` from `/api/connector/{segment}/:id`.
 * Digits-only values stay numeric for integer primary keys; everything else is the decoded string key.
 */
export function parseConnectorRouteId(raw: string): ConnectorRouteId {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/** Numeric catalog entities (integer PK) — coerce route param before repository calls. */
export function coerceConnectorNumericId(id: ConnectorRouteId): number {
  if (typeof id === 'number') {
    return id;
  }
  const trimmed = String(id).trim();
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  throw new Error(`Expected numeric connector id, received "${String(id)}"`);
}

export interface CatalogCrudConnectorHandlers<TRecord> {
  list(): TRecord[];
  getById(id: ConnectorRouteId): TRecord | null;
  /**
   * May return a promise: person fields need a platform user lookup to resolve a display
   * name when the caller submitted a user id.
   */
  create(body: unknown, request?: FastifyRequest): TRecord | Promise<TRecord>;
  update(
    id: ConnectorRouteId,
    body: unknown,
    request?: FastifyRequest,
  ): TRecord | Promise<TRecord | null>;
  delete(id: ConnectorRouteId): boolean;
  toConnector(record: TRecord): Record<string, unknown>;
  parseCreate?: (body: Record<string, unknown>) => unknown;
  parseUpdate?: (body: Record<string, unknown>) => unknown;
  /**
   * Resolve options for a lookup property.
   *
   * `enum` and `self-entity` are handled generically from manifest metadata by
   * `registerCatalogLookupRoutes`; use this only for app-specific resolution
   * (e.g. a property backed by a custom query).
   */
  lookupOptions?: (propertyName: string) => CatalogLookupOption[] | null;
}

/** Standard `/api/connector/{segment}` CRUD (Forms Builder contract). */
export async function registerCatalogCrudConnectorRoutes<TRecord>(
  server: FastifyInstance,
  prefix: string,
  handlers: CatalogCrudConnectorHandlers<TRecord>,
): Promise<void> {
  server.get(prefix, async () => handlers.list().map((row) => handlers.toConnector(row)));

  server.get(
    `${prefix}/:id`,
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseConnectorRouteId(request.params.id);
      const row = handlers.getById(id);
      if (!row) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return handlers.toConnector(row);
    },
  );

  server.post(prefix, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    try {
      const parsed = handlers.parseCreate ? handlers.parseCreate(body) : body;
      const created = await handlers.create(parsed, request);
      return reply.status(201).send(handlers.toConnector(created));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid body';
      return reply.status(400).send({ error: message });
    }
  });

  server.post(
    `${prefix}/:id`,
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseConnectorRouteId(request.params.id);
      const body = (request.body ?? {}) as Record<string, unknown>;
      try {
        const parsed = handlers.parseUpdate ? handlers.parseUpdate(body) : body;
        const updated = await handlers.update(id, parsed, request);
        if (!updated) {
          return reply.status(404).send({ error: 'Not found' });
        }
        return handlers.toConnector(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid body';
        return reply.status(400).send({ error: message });
      }
    },
  );

  server.delete(
    `${prefix}/:id`,
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const id = parseConnectorRouteId(request.params.id);
      if (!handlers.delete(id)) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.status(204).send();
    },
  );
}

/**
 * Registers `GET {prefix}/lookups/:propertyName` for a catalog connector.
 *
 * Catalog discovery advertises lookup contracts (`buildCatalogLookupContracts()`), so the
 * matching endpoint has to exist or those contracts 404. Resolution order:
 *
 * 1. App-specific `handlers.lookupOptions(propertyName)`.
 * 2. `enum` options from the manifest property metadata.
 * 3. `self-entity` — the entity's own rows, labelled by `lookupLabelProperty`.
 *
 * `lab-user` lookups do not use this route; they resolve against the platform users
 * endpoint. `provider-entity` lookups are served by the provider app, not here.
 */
export async function registerCatalogLookupRoutes<TRecord>(
  server: FastifyInstance,
  prefix: string,
  handlers: CatalogCrudConnectorHandlers<TRecord>,
  properties: readonly FormBuilderContractModelProperty[] = [],
): Promise<void> {
  const byName = new Map(properties.map((prop) => [prop.name, prop]));

  server.get(
    `${prefix}/lookups/:propertyName`,
    async (
      request: FastifyRequest<{ Params: { propertyName: string } }>,
      reply: FastifyReply,
    ) => {
      const { propertyName } = request.params;

      const custom = handlers.lookupOptions?.(propertyName);
      if (custom) {
        return custom;
      }

      const property = byName.get(propertyName);
      if (!property) {
        return reply.status(404).send({ error: 'Unknown property' });
      }

      if (property.lookupProvider === 'enum') {
        return (property.options ?? []).map((option) => ({
          id: option.value,
          value: option.value,
          label: option.label,
        }));
      }

      if (property.lookupProvider === 'self-entity') {
        const labelKey = property.lookupLabelProperty ?? 'name';
        return handlers.list().map((row) => {
          const connector = handlers.toConnector(row);
          const id = connector.id;
          const label = connector[labelKey] ?? connector.name ?? connector.title ?? String(id);
          return { id: id as string | number, value: String(id), label: String(label) };
        });
      }

      return reply
        .status(400)
        .send({ error: 'Property is not an enum or self-entity lookup' });
    },
  );
}

export function zodBodyParser<T extends z.ZodType>(
  schema: T,
): (body: Record<string, unknown>) => z.infer<T> {
  return (body) => schema.parse(body);
}
