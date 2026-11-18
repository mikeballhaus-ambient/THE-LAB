import { afterEach, beforeAll, describe, expect, jest, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { broadcastLabCommsDmEnvelope } from '@/backend/comms/lab-comms-dm-broadcast';
import { ProviderService } from '@/backend/ai/provider-service';
import { labCommsRepository } from '@/backend/db/Comms/lab-comms-repository';
import { UserService } from '@/backend/db/Auth/auth-service';
import { labWorkflowsService } from '@/backend/db/LabWorkflows/lab-workflows-service';
import { labWorkflowRun } from '@/backend/mcp/mcp-servers/workflow/workflow-mcp-handlers';
import { LAB_COMMS_EVENTS } from '@/shared/types/lab-comms-events';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import type { LabEnvelope } from '@/shared/types/lab-comms';

/**
 * A workflow DM reaches the recipient two ways: the SQLite row (survives a reload) and the socket
 * fan-out (what makes the open thread update live). Only the first is covered by the persistence
 * tests — so a missing `io` produced a DM row, an unread badge, and an empty thread until the user
 * refreshed the page. These tests pin the second half.
 */

type Emitted = { room: string; event: string; payload: unknown };

function fakeIo(emitted: Emitted[]) {
  const nsp = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        emitted.push({ room, event, payload });
      },
    }),
  };
  return { of: () => nsp } as unknown as import('socket.io').Server;
}

function envelope(): LabEnvelope {
  return {
    id: 'env-1',
    channelId: 'dm:2:12' as LabEnvelope['channelId'],
    type: 'dm.text',
    senderUserId: LAB_PLATFORM_SYSTEM_USER_ID,
    sentAt: '2026-10-26T14:49:19.608Z',
    payload: { text: 'Loop demo finished: stepValue reached 3.' },
  };
}

describe('workflow DM socket fan-out', () => {
  let db: Database.Database;

  beforeAll(async () => {
    // `broadcastLabCommsDmEnvelope` computes the recipient's unread summary, so the repository needs a
    // real schema — the point of the test is the fan-out, not a stubbed summary.
    db = new Database(':memory:');
    db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, name TEXT, role TEXT, status TEXT);`);
    db.exec(
      `INSERT INTO users (id, email, name, role, status) VALUES (2, 'b@test', 'Bob', 'member', 'active')`,
    );
    await labCommsRepository.bootstrap(db);
  });

  afterAll(() => {
    db.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('broadcasts the envelope to the recipient inbox, sender inbox and channel', () => {
    const emitted: Emitted[] = [];
    broadcastLabCommsDmEnvelope(fakeIo(emitted), LAB_PLATFORM_SYSTEM_USER_ID, 2, envelope());

    const messageRooms = emitted
      .filter((e) => e.event === LAB_COMMS_EVENTS.MESSAGE)
      .map((e) => e.room);
    expect(messageRooms).toContain('user:2');
    expect(messageRooms).toContain('dm:2:12');
    // The recipient's badge must move even when their thread is closed.
    expect(emitted.some((e) => e.event === LAB_COMMS_EVENTS.UNREAD_SUMMARY && e.room === 'user:2'))
      .toBe(true);
  });

  test('is a no-op without an io instance rather than throwing', () => {
    expect(() =>
      broadcastLabCommsDmEnvelope(undefined, LAB_PLATFORM_SYSTEM_USER_ID, 2, envelope()),
    ).not.toThrow();
  });

  test('lab_workflow_run forwards the live server io into the run', async () => {
    const io = fakeIo([]);
    jest.spyOn(ProviderService.getInstance(), 'getSocketIOServer').mockReturnValue(io);
    const runSpy = jest
      .spyOn(labWorkflowsService, 'runForCaller')
      .mockRejectedValue(new Error('stop-after-forwarding'));
    // `executeRun` resolves the caller from the platform DB before it reaches the service.
    jest.spyOn(UserService.getInstance(), 'getUserById').mockReturnValue({
      id: 1,
      userId: 1,
      email: 'a@test',
      name: 'Admin',
      role: 'admin',
      status: 'active',
      lastSeen: '',
      createdAt: '',
    } as never);
    // The workflow lookup runs before the call; a stubbed record keeps this test about the options.
    jest.spyOn(labWorkflowsService, 'getForCaller').mockReturnValue({
      id: 'wf-1',
      name: 'DM test',
      scope: 'global',
      ownerUserId: 1,
      enabled: true,
      priority: 100,
      definition: {
        schemaVersion: 1,
        trigger: { eventType: 'platform-webhook.request.received' },
        steps: [{ kind: 'comms_system_dm_payload_user', path: 'assigneeId' }],
      },
    } as never);

    await labWorkflowRun({ userId: 1, workflowId: 'wf-1' } as never);

    expect(runSpy).toHaveBeenCalledTimes(1);
    const options = runSpy.mock.calls[0]?.[2] as { io?: unknown } | undefined;
    // The regression: without this, `comms_system_dm_payload_user` writes the row and skips the push.
    expect(options?.io).toBe(io);
  });
});
