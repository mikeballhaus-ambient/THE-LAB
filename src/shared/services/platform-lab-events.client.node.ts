import type { FastifyRequest } from 'fastify';
import { resolvePlatformBackendUrl } from '@/shared/config/resolve-platform-backend-url.node';
import { resolveLabAppActorUserId } from '@/shared/server/lab-app-http-auth';
import { buildPlatformServiceAuthHeaders } from '@/shared/services/platform-user-client.node';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';

export interface PublishLabDomainEventResult {
  eventId: string;
}

function buildPublishHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const cookie = request.headers.cookie;
  if (cookie) {
    headers.Cookie = cookie;
  }
  const actorUserId = resolveLabAppActorUserId(request);
  Object.assign(headers, buildPlatformServiceAuthHeaders(actorUserId));
  return headers;
}

export async function publishLabDomainEvent(
  request: FastifyRequest,
  envelope: LabDomainEventEnvelopeV1,
): Promise<PublishLabDomainEventResult> {
  const baseUrl = resolvePlatformBackendUrl();
  const response = await fetch(`${baseUrl}/api/platform/lab-events/publish`, {
    method: 'POST',
    headers: buildPublishHeaders(request),
    body: JSON.stringify(envelope),
  });

  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error ?? `HTTP ${response.status}: ${body.message}`);
  }

  return body.data;
}
