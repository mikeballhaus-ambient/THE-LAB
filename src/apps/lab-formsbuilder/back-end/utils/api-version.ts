/**
 * API Version Management Utility
 * 
 * Provides path-based API versioning support with automatic deprecation headers.
 */

import { FastifyInstance, FastifyRequest, RouteHandlerMethod } from 'fastify';

export const API_VERSION = 'v1';
export const CURRENT_API_VERSION = API_VERSION;

/**
 * API Version Configuration
 */
export interface ApiVersionConfig {
  version: string;
  deprecated?: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
}

/**
 * Get the current API version from request path
 * @param request The Fastify request object
 * @returns The detected API version or default version
 */
export function getApiVersionFromRequest(request: FastifyRequest): string {
  const path = request.url || '';
  
  // Match /api/v1/*, /api/v2/*, etc.
  const match = path.match(/^\/api\/v(\d+)/);
  
  if (match) {
    return `v${match[1]}`;
  }
  
  // Default to current version
  return CURRENT_API_VERSION;
}

/**
 * Check if a request is using an API version that should be deprecated
 * @param request The Fastify request object
 * @returns Object with deprecation info or null if not deprecated
 */
export function checkApiDeprecation(request: FastifyRequest): ApiVersionConfig | null {
  const path = request.url || '';
  
  // Check for v0 (deprecated)
  if (path.startsWith('/api/v0/')) {
    return {
      version: 'v0',
      deprecated: true,
      deprecationDate: new Date('2026-01-01'),
      sunsetDate: new Date('2027-01-01'),
    };
  }
  
  // Check for v1 (current)
  if (path.startsWith('/api/v1/')) {
    return null;
  }
  
  // Unknown version - treat as deprecated
  return {
    version: 'unknown',
    deprecated: true,
    deprecationDate: new Date(),
    sunsetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  };
}

/**
 * Middleware to add API version headers to responses
 * @param server The Fastify server instance
 */
export function addApiVersionHeaders(server: FastifyInstance) {
  server.addHook('onSend', async (request, reply, payload) => {
    const apiVersion = getApiVersionFromRequest(request);
    reply.header('X-API-Version', apiVersion);
    return payload;
  });
}

/**
 * Middleware to add deprecation headers when using deprecated API versions
 * @param server The Fastify server instance
 */
export function addDeprecationHeaders(server: FastifyInstance) {
  server.addHook('onSend', async (request, reply, payload) => {
    const deprecationInfo = checkApiDeprecation(request);

    if (deprecationInfo?.deprecated && deprecationInfo.sunsetDate) {
      reply.header('Deprecation', 'true');
      reply.header('Sunset', deprecationInfo.sunsetDate.toUTCString());
    }

    return payload;
  });
}

/**
 * Route factory for creating versioned API routes
 * @param basePath The base path (e.g., '/api/v1')
 * @param handler The route handler function
 * @returns A Fastify route configuration object
 */
export function createVersionedRoute(
  basePath: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  handler: RouteHandlerMethod
): { url: string; method: string; handler: RouteHandlerMethod } {
  return {
    url: `${basePath}${path}`,
    method,
    handler,
  };
}

function normalizeBasePath(basePath: string): string {
  return basePath.startsWith('/') ? basePath : `/${basePath}`;
}

/**
 * Versioned path segment (use with Fastify plugin prefix `/api`).
 * @returns e.g. `/v1/forms` → full URL `/api/v1/forms`
 */
export function getVersionedPath(basePath: string): string {
  return `/${API_VERSION}${normalizeBasePath(basePath)}`;
}

/** Legacy unversioned path (deprecated alias). @returns e.g. `/forms` → `/api/forms` */
export function getLegacyPath(basePath: string): string {
  return normalizeBasePath(basePath);
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

/** Register handler on both `/v1/...` and legacy `/...` under the `/api` plugin prefix. */
export function registerVersionedRoutes(
  server: FastifyInstance,
  method: HttpMethod,
  basePath: string,
  handler: RouteHandlerMethod
): void {
  server[method](getVersionedPath(basePath), handler);
  server[method](getLegacyPath(basePath), handler);
}
