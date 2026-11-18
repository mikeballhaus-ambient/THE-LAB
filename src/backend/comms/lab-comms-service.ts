import { randomUUID } from 'node:crypto';
import type { LabEnvelope } from '@/shared/types/lab-comms';
import {
  LAB_COMMS_MAX_MESSAGE_LENGTH,
  LAB_COMMS_MESSAGE_TYPE_DM_TEXT,
} from '@/shared/types/lab-comms';
import { dmChannelId } from '@/shared/types/schemas/lab-comms-schema';
import { validateGameInviteEnvelopePayload } from '@/shared/types/schemas/lab-comms-game-invite-schema';
import { labCommsRepository } from '../db/Comms/lab-comms-repository';

export type SendDmResult =
  | { success: true; envelope: LabEnvelope }
  | { success: false; code: string; message: string };

export class LabCommsService {
  private static instance: LabCommsService | null = null;

  public static getInstance(): LabCommsService {
    if (!this.instance) {
      this.instance = new LabCommsService();
    }
    return this.instance;
  }

  sendDmText(fromUserId: number, toUserId: number, rawText: string): SendDmResult {
    if (fromUserId === toUserId) {
      return { success: false, code: 'SELF_DM', message: 'Cannot send a direct message to yourself' };
    }
    const text = rawText.trim();
    if (!text) {
      return { success: false, code: 'EMPTY', message: 'Message text is required' };
    }
    if (text.length > LAB_COMMS_MAX_MESSAGE_LENGTH) {
      return {
        success: false,
        code: 'TOO_LONG',
        message: `Message exceeds ${LAB_COMMS_MAX_MESSAGE_LENGTH} characters`,
      };
    }

    const channelId = dmChannelId(fromUserId, toUserId);
    labCommsRepository.ensureDmMembers(channelId, [fromUserId, toUserId]);

    const envelope: LabEnvelope = {
      id: randomUUID(),
      channelId,
      type: LAB_COMMS_MESSAGE_TYPE_DM_TEXT,
      senderUserId: fromUserId,
      sentAt: new Date().toISOString(),
      payload: { text },
    };

    labCommsRepository.insertMessage(envelope);
    return { success: true, envelope };
  }

  sendDmEnvelope(
    fromUserId: number,
    toUserId: number,
    type: string,
    payload: Record<string, unknown>,
  ): SendDmResult {
    if (fromUserId === toUserId) {
      return { success: false, code: 'SELF_DM', message: 'Cannot message yourself' };
    }
    const validation = validateGameInviteEnvelopePayload(type, payload);
    if (!validation.ok) {
      return { success: false, code: 'INVALID_PAYLOAD', message: validation.message };
    }

    const channelId = dmChannelId(fromUserId, toUserId);
    labCommsRepository.ensureDmMembers(channelId, [fromUserId, toUserId]);

    const envelope: LabEnvelope = {
      id: randomUUID(),
      channelId,
      type,
      senderUserId: fromUserId,
      sentAt: new Date().toISOString(),
      payload,
    };

    labCommsRepository.insertMessage(envelope);
    return { success: true, envelope };
  }

  listHistory(
    viewerUserId: number,
    channelId: string,
    limit?: number,
    before?: string,
  ): LabEnvelope[] {
    return labCommsRepository.listMessages(channelId, limit, before, viewerUserId);
  }

  clearChannelHistoryForUser(userId: number, channelId: string): void {
    const at = labCommsRepository.latestMessageSentAt(channelId) ?? new Date().toISOString();
    labCommsRepository.setHistoryCleared(userId, channelId, at);
    labCommsRepository.upsertReadCursor(userId, channelId, at);
  }

  listDmChannelsForUser(userId: number) {
    return labCommsRepository.listDmChannelsForUser(userId);
  }

  markChannelRead(userId: number, channelId: string, at = new Date().toISOString()): void {
    labCommsRepository.upsertReadCursor(userId, channelId, at);
  }

  unreadSummary(userId: number) {
    return labCommsRepository.buildUnreadSummary(userId);
  }
}

export const labCommsService = LabCommsService.getInstance();
