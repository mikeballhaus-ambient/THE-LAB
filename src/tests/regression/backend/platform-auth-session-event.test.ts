import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const publishMock = jest.fn<() => Promise<{ published: boolean; notifications: []; workflowsStarted: number }>>();

await jest.unstable_mockModule('@/backend/lab-events/publish-lab-domain-event-pipeline', () => ({
  publishLabDomainEventPipeline: (...args: unknown[]) => publishMock(...args),
}));

const { afterLabSessionCreated } = await import('@/backend/auth/after-lab-session-created');

describe('platform.auth.session.established', () => {
  beforeEach(() => {
    publishMock.mockReset();
    publishMock.mockResolvedValue({ published: true, notifications: [], workflowsStarted: 0 });
    delete process.env.LAB_AUTH_SESSION_EVENTS;
  });

  afterEach(() => {
    delete process.env.LAB_AUTH_SESSION_EVENTS;
  });

  test('afterLabSessionCreated publishes session envelope', async () => {
    afterLabSessionCreated({
      userId: 7,
      sessionId: 'sess-test',
      authMethod: 'password',
      providerKey: null,
    });

    await Promise.resolve();

    expect(publishMock).toHaveBeenCalledTimes(1);
    const envelope = publishMock.mock.calls[0]?.[0] as { type?: string; sourceAppId?: string; payload?: Record<string, unknown> };
    expect(envelope?.type).toBe('platform.auth.session.established');
    expect(envelope?.sourceAppId).toBe('platform-auth');
    expect(envelope?.payload).toMatchObject({ userId: 7, sessionId: 'sess-test', authMethod: 'password' });
  });

  test('LAB_AUTH_SESSION_EVENTS=0 skips publish', async () => {
    process.env.LAB_AUTH_SESSION_EVENTS = '0';

    afterLabSessionCreated({
      userId: 7,
      sessionId: 'sess-test',
      authMethod: 'socket',
    });

    await Promise.resolve();
    expect(publishMock).not.toHaveBeenCalled();
  });
});