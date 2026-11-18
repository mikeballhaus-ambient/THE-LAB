import type { FastifyRequest } from 'fastify';

export function buildConnectorForwardHeaders(options: {
  authorization?: string;
  hostAppId?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};
  if (options.authorization) {
    headers.Authorization = options.authorization;
  }
  if (options.hostAppId) {
    headers['X-Host-App-Id'] = options.hostAppId;
  }
  return headers;
}

/** Forward browser JWT + host scope from an app-server inbound request to connector HTTP calls. */
export function connectorForwardHeadersFromFastifyRequest(
  request: FastifyRequest,
): Record<string, string> {
  const auth = request.headers.authorization;
  const hostApp = request.headers['x-host-app-id'];
  return buildConnectorForwardHeaders({
    authorization: auth ? (Array.isArray(auth) ? auth[0] : auth) : undefined,
    hostAppId: hostApp ? (Array.isArray(hostApp) ? hostApp[0] : hostApp) : undefined,
  });
}

export function hostAppIdFromRenderContext(
  context: Record<string, unknown> | undefined,
): string | undefined {
  const raw = context?.hostAppId;
  if (raw == null || raw === '') {
    return undefined;
  }
  return String(raw);
}

/** Context keys used only for server-side connector forwarding (not connector query params). */
export function chartConnectorFilterContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const { hostAppId, ...rest } = context;
  void hostAppId;
  return rest;
}
