/**
 * Request Tracing Middleware
 *
 * Provides structured logging and request tracing for all API requests.
 * Includes correlation IDs, timing information, and error tracking.
 */

import { FastifyInstance, type FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request Trace Metadata
 */
export interface RequestTraceMetadata {
  correlationId: string;           // Unique request identifier
  timestamp: number;               // Request start time (ms)
  method: string;                  // HTTP method
  path: string;                    // Request path
  version?: string;                // API version if available
  headers?: Record<string, string>; // Relevant headers
}

/**
 * Trace Result Metadata
 */
export interface TraceResultMetadata {
  durationMs: number;              // Total request duration
  status: 'success' | 'error';     // Request outcome
  error?: string;                  // Error message if failed
}

/**
 * Request Tracing Context
 */
export interface RequestContext {
  traceId: string;                 // Correlation ID for this request
  startTime: number;               // When request started
  headers: Record<string, string>; // Request headers
}

/**
 * Trace Event Types
 */
export type TraceEvent = 'request-start' | 'request-end' | 'error';

/**
 * Trace Event Payload
 */
export interface TraceEventPayload {
  traceId: string;
  event: TraceEvent;
  metadata?: RequestTraceMetadata;
  result?: TraceResultMetadata;
}

/**
 * Create request tracing middleware
 * @param server The Fastify server instance
 */
/** Paths often probed by debuggers/browsers; 404 is expected on the app API port. */
const QUIET_NOT_FOUND_PATHS = new Set(['/', '/json/version', '/json/list', '/favicon.ico']);

function isQuietProbe(request: { method: string; url: string }, statusCode: number): boolean {
  if (statusCode !== 404) return false;
  const path = request.url.split('?')[0] ?? request.url;
  return request.method === 'GET' && QUIET_NOT_FOUND_PATHS.has(path);
}

function logRequestComplete(
  traceId: string,
  method: string,
  url: string,
  durationMs: number,
  statusCode: number
): void {
  const line =
    `[TRACE] ${traceId} - Request completed: ${method} ${url} in ${durationMs}ms Status: ${statusCode}`;

  if (statusCode >= 500) {
    console.error(line);
  } else if (statusCode >= 400) {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function addRequestTracingMiddleware(server: FastifyInstance) {
  // Add correlation ID header to all requests
  server.addHook('preHandler', async (request) => {
    const headerTrace = request.headers['x-trace-id'];
    const traceId =
      (typeof headerTrace === 'string' && headerTrace.length > 0
        ? headerTrace
        : Array.isArray(headerTrace)
          ? headerTrace.find((v) => typeof v === 'string' && v.length > 0)
          : undefined) ?? uuidv4();
    
    // Store trace context in request object for later use
    (request as FastifyRequest & { traceContext: RequestContext }).traceContext = {
      traceId,
      startTime: Date.now(),
      headers: {},
    };

    const path = request.url.split('?')[0] ?? request.url;
    if (!(request.method === 'GET' && QUIET_NOT_FOUND_PATHS.has(path))) {
      console.info(`[TRACE] ${traceId} - Request started: ${request.method} ${request.url}`);
    }
  });

  // Add response completion hook for tracing
  server.addHook('onSend', async (request, reply, payload) => {
    const traceContext = (request as { traceContext?: RequestContext }).traceContext;

    if (traceContext) {
      const durationMs = Date.now() - traceContext.startTime;

      if (!isQuietProbe(request, reply.statusCode)) {
        logRequestComplete(
          traceContext.traceId,
          request.method,
          request.url,
          durationMs,
          reply.statusCode
        );
      }
    }

    return payload;
  });

  // Add error handling hook for tracing errors
  server.addHook('onError', async (request, reply, error) => {
    const traceContext = (request as FastifyRequest & { traceContext?: RequestContext }).traceContext;
    
    if (traceContext) {
      const durationMs = Date.now() - traceContext.startTime;
      
      console.error(
        `[TRACE] ${traceContext.traceId} - Request failed: ${request.method} ${request.url} in ${durationMs}ms` +
        ` Error: ${error.message}`
      );

      if (error.stack) {
        console.error(`[TRACE] ${traceContext.traceId} - Stack:\n${error.stack}`);
      }
    }
  });

  // Add headers to responses for tracing
  server.addHook('onSend', async (request, reply, payload) => {
    const traceContext = (request as { traceContext?: RequestContext }).traceContext;

    if (traceContext) {
      reply.header('X-Trace-ID', traceContext.traceId);
    }

    return payload;
  });

  // Add request ID header to responses
  server.addHook('onSend', async (request, reply, payload) => {
    const traceContext = (request as { traceContext?: RequestContext }).traceContext;

    if (traceContext) {
      reply.header('X-Request-ID', traceContext.traceId);
    }

    return payload;
  });
}

/**
 * Create a structured log entry for request tracing
 */
export function createTraceLogEntry(
  traceId: string,
  event: TraceEvent,
  metadata?: RequestTraceMetadata,
  result?: TraceResultMetadata
): string {
  const parts: string[] = [];
  
  parts.push(`[TRACE] ${traceId}`);
  
  switch (event) {
    case 'request-start':
      parts.push(`Request started: ${metadata?.method} ${metadata?.path || ''}`);
      break;
    case 'request-end':
      parts.push(
        `Request completed: ${metadata?.method} ${metadata?.path || ''} in ${result?.durationMs}ms` +
        ` Status: ${metadata?.version || 'v1'}`
      );
      break;
    case 'error':
      parts.push(`Request failed: ${metadata?.method} ${metadata?.path || ''} - ${result?.error || 'Unknown error'}`);
      break;
  }
  
  return parts.join(' ');
}

/**
 * Extract trace ID from request headers or generate new one
 */
export function getOrCreateTraceId(headers: Record<string, string> | undefined): string {
  return headers?.['x-trace-id'] || uuidv4();
}

/**
 * Create a trace context object
 */
export function createTraceContext(
  headers: Record<string, string> | undefined = {}
): RequestContext {
  return {
    traceId: getOrCreateTraceId(headers),
    startTime: Date.now(),
    headers: {},
  };
}
