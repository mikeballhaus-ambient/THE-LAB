import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { appsService } from '../db/Apps/apps-service';
import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';
import {
  resolveApiBaseHostFromEnv,
} from '@/shared/services/app-server-url-resolution';

declare module 'fastify' {
  interface FastifyRequest {
    labUser?: User;
  }
}

interface LookupOption {
  id: string | number;
  value: string;
  label: string;
}

function parseOptions(payload: unknown): LookupOption[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? ((payload as { data: unknown[] }).data)
      : [];

  const out: LookupOption[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const record = row as Record<string, unknown>;
    const rawId = record.id ?? record.value;
    if (rawId == null) {
      continue;
    }
    const value = record.value != null ? String(record.value) : String(rawId);
    const label =
      record.label != null
        ? String(record.label)
        : record.name != null
          ? String(record.name)
          : value;
    out.push({ id: rawId as string | number, value, label });
  }
  return out;
}

/** Resolve a provider app's base URL from the registry + env host (never hardcoded). */
export function resolveProviderBaseUrl(providerAppId: string): string | null {
  const app = appsService.getAppById(providerAppId);
  const port = app?.server?.port;
  if (!port || port <= 0) {
    return null;
  }
  const apiHost = resolveApiBaseHostFromEnv({
    backendUrl: process.env.BACKEND_URL,
    theLabBackendUrl: process.env.THE_LAB_BACKEND_URL,
    viteApiBaseUrl: process.env.VITE_API_BASE_URL,
    baseUrl: process.env.BASEURL,
  });
  return `${apiHost.replace(/\/$/, '')}:${port}`;
}

/**
 * Cross-app catalog lookups.
 *
 * Catalog discovery advertises `provider-entity` lookup contracts pointing at another
 * app's connector. A catalog app on its own port cannot resolve that directly without
 * hardcoding the provider's port, so this platform route does the resolution:
 *
 * ```
 * GET /api/platform/lab-lookup/:providerAppId/:entityKey/lookups/:propertyName
 * ```
 *
 * - resolves the provider's current port from the registry
 * - forwards with service-token + acting-user headers
 * - normalizes the response to `[{ id, value, label }]`
 *
 * Callers never learn the provider port, so provider port changes stay invisible.
 */
export function registerPlatformCatalogLookupRoutes(server: FastifyInstance): void {
  server.get(
    '/api/platform/lab-lookup/:providerAppId/:entityKey/lookups/:propertyName',
    async (
      request: FastifyRequest<{
        Params: { providerAppId: string; entityKey: string; propertyName: string };
      }>,
      reply: FastifyReply,
    ) => {
      const caller = await requirePlatformHttpUser(request, reply);
      if (!caller) {
        return;
      }

      const { providerAppId, entityKey, propertyName } = request.params;
      const base = resolveProviderBaseUrl(providerAppId);
      if (!base) {
        return reply.status(404).send({
          success: false,
          error: 'Provider app not found or has no server port',
          providerAppId,
        });
      }

      const callerId = caller.id;
      if (callerId == null) {
        return reply.status(401).send({ success: false, error: 'Authentication required' });
      }

      const url = `${base}/api/connector/${encodeURIComponent(entityKey)}/lookups/${encodeURIComponent(propertyName)}`;
      let response: Response;
      try {
        response = await fetch(url, {
          headers: buildPlatformServiceAuthHeaders(callerId),
        });
      } catch (err) {
        return reply.status(502).send({
          success: false,
          error: 'Provider unreachable',
          message: err instanceof Error ? err.message : String(err),
        });
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return reply.status(response.status === 404 ? 404 : 502).send({
          success: false,
          error: 'Provider lookup failed',
          status: response.status,
          message: text,
        });
      }

      const payload: unknown = await response.json().catch(() => []);
      return reply.send({ success: true, data: parseOptions(payload) });
    },
  );
}
