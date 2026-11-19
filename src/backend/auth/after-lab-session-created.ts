import { randomUUID } from 'node:crypto';
import type { Server as SocketIOServer } from 'socket.io';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import { publishLabDomainEventPipeline } from '@/backend/lab-events/publish-lab-domain-event-pipeline';

export type LabSessionAuthMethod = 'password' | 'oidc' | 'socket';

export function afterLabSessionCreated(params: {
  userId: number;
  sessionId: string;
  authMethod: LabSessionAuthMethod;
  providerKey?: string | null;
  io?: SocketIOServer;
}): void {
  if (process.env.LAB_AUTH_SESSION_EVENTS === '0') {
    return;
  }
  const envelope: LabDomainEventEnvelopeV1 = {
    schemaVersion: 1,
    id: randomUUID(),
    type: 'platform.auth.session.established',
    sourceAppId: 'platform-auth',
    occurredAt: new Date().toISOString(),
    actorUserId: params.userId,
    payload: {
      userId: params.userId,
      sessionId: params.sessionId,
      authMethod: params.authMethod,
      providerKey: params.providerKey ?? null,
      utcDate: new Date().toISOString().slice(0, 10),
    },
  };
  void publishLabDomainEventPipeline(envelope, params.userId, params.io).catch((err) => {
    console.error('[platform-auth] session.established workflow publish failed', err);
  });
}