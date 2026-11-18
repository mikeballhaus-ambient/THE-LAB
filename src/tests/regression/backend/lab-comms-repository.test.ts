import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import betterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createUsersTable } from '@/backend/db/Auth/auth-schema';
import { labCommsRepository } from '@/backend/db/Comms/lab-comms-repository';
import { labCommsService } from '@/backend/comms/lab-comms-service';
import { LAB_COMMS_MESSAGE_TYPE_DM_TEXT } from '@/shared/types/lab-comms';

describe('lab-comms repository and service', () => {
  let db: betterSqlite3.Database;

  beforeAll(async () => {
    db = betterSqlite3(':memory:');
    db.exec(createUsersTable);
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (1, 'a@test', 'Alice', 'member', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO users (id, email, name, role, status) VALUES (2, 'b@test', 'Bob', 'member', 'active')`,
    ).run();
    await labCommsRepository.bootstrap(db);
  });

  afterAll(() => {
    labCommsRepository.close();
    db.close();
  });

  test('sendDmText persists and lists channel with preview', () => {
    const sent = labCommsService.sendDmText(1, 2, '  Hello Bob  ');
    expect(sent.success).toBe(true);
    if (!sent.success) {
      return;
    }
    expect(sent.envelope.type).toBe(LAB_COMMS_MESSAGE_TYPE_DM_TEXT);
    expect(sent.envelope.payload).toEqual({ text: 'Hello Bob' });

    const channelsForTwo = labCommsService.listDmChannelsForUser(2);
    expect(channelsForTwo).toHaveLength(1);
    expect(channelsForTwo[0].partnerUserId).toBe(1);
    expect(channelsForTwo[0].lastMessagePreview).toBe('Hello Bob');
    expect(channelsForTwo[0].unreadCount).toBe(1);

    const history = labCommsService.listHistory(2, sent.envelope.channelId);
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(sent.envelope.id);
  });

  test('mark read clears unread for recipient', () => {
    const channelId = labCommsService.sendDmText(1, 2, 'ping').success
      ? labCommsRepository.dmChannelForUsers(1, 2)
      : 'dm:1:2';
    labCommsService.markChannelRead(2, channelId);
    const summary = labCommsService.unreadSummary(2);
    expect(summary.total).toBe(0);
  });

  test('rejects self dm', () => {
    const result = labCommsService.sendDmText(1, 1, 'nope');
    expect(result.success).toBe(false);
  });

  test('listMessages pagination respects before cursor', () => {
    const channelId = labCommsRepository.dmChannelForUsers(1, 2);
    const firstAt = new Date().toISOString();
    labCommsRepository.insertMessage({
      id: randomUUID(),
      channelId,
      type: LAB_COMMS_MESSAGE_TYPE_DM_TEXT,
      senderUserId: 1,
      sentAt: firstAt,
      payload: { text: 'older' },
    });
    const secondAt = new Date(Date.now() + 1000).toISOString();
    labCommsRepository.insertMessage({
      id: randomUUID(),
      channelId,
      type: LAB_COMMS_MESSAGE_TYPE_DM_TEXT,
      senderUserId: 2,
      sentAt: secondAt,
      payload: { text: 'newer' },
    });
    const page = labCommsRepository.listMessages(channelId, 10, secondAt);
    expect(page.every((m) => m.sentAt < secondAt)).toBe(true);
  });

  test('clearChannelHistoryForUser hides messages for that user only', () => {
    const channelId = labCommsRepository.dmChannelForUsers(1, 2);
    db.prepare(`DELETE FROM lab_comms_messages WHERE channel_id = ?`).run(channelId);
    db.prepare(`DELETE FROM lab_comms_history_clear WHERE channel_id = ?`).run(channelId);
    labCommsService.sendDmText(1, 2, 'before clear');
    labCommsService.clearChannelHistoryForUser(2, channelId);
    expect(labCommsService.listHistory(2, channelId)).toHaveLength(0);
    expect(labCommsService.listHistory(1, channelId)).toHaveLength(1);
    const afterClearAt = new Date(Date.now() + 5).toISOString();
    labCommsRepository.insertMessage({
      id: randomUUID(),
      channelId,
      type: LAB_COMMS_MESSAGE_TYPE_DM_TEXT,
      senderUserId: 1,
      sentAt: afterClearAt,
      payload: { text: 'after clear' },
    });
    expect(labCommsService.listHistory(2, channelId)).toHaveLength(1);
    expect(labCommsService.listHistory(2, channelId)[0].payload).toEqual({ text: 'after clear' });
  });

  test('deleteAllDataForUser clears comms so user row can be removed', () => {
    labCommsService.sendDmText(1, 2, 'before delete');
    labCommsRepository.deleteAllDataForUser(1);
    expect(labCommsService.listDmChannelsForUser(2)).toHaveLength(0);
    const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
    expect(() => deleteUser.run(1)).not.toThrow();
  });
});
