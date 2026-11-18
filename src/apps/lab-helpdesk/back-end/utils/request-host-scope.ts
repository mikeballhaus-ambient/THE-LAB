import type { FastifyRequest } from 'fastify';

const HEADER = 'x-host-app-id';

export function hostAppIdFromRequest(request: FastifyRequest): string | null {
  const raw = request.headers[HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || String(value).trim() === '') {
    return null;
  }
  return String(value).trim();
}
