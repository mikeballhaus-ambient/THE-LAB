import { parseChannelId } from '@/shared/types/schemas/lab-comms-schema';
import { labCommsRepository } from '../db/Comms/lab-comms-repository';

export function dmPartnerUserId(
  channelId: string,
  selfUserId: number,
): number | null {
  const parsed = parseChannelId(channelId);
  if (!parsed || parsed.kind !== 'dm') {
    return null;
  }
  if (parsed.userLo === selfUserId) {
    return parsed.userHi;
  }
  if (parsed.userHi === selfUserId) {
    return parsed.userLo;
  }
  return null;
}

export function canSubscribe(userId: number, channelId: string): boolean {
  const parsed = parseChannelId(channelId);
  if (!parsed) {
    return false;
  }
  switch (parsed.kind) {
    case 'user':
      return parsed.userId === userId;
    case 'dm':
      return dmPartnerUserId(channelId, userId) !== null;
    case 'room':
      return labCommsRepository.isChannelMember(channelId, userId);
    default:
      return false;
  }
}

export function canSend(
  userId: number,
  channelId: string,
  type: string,
): boolean {
  if (type !== 'dm.text') {
    return false;
  }
  const parsed = parseChannelId(channelId);
  if (!parsed || parsed.kind !== 'dm') {
    return false;
  }
  return dmPartnerUserId(channelId, userId) !== null;
}

export function canAccessDmHistory(userId: number, channelId: string): boolean {
  const parsed = parseChannelId(channelId);
  if (!parsed || parsed.kind !== 'dm') {
    return false;
  }
  return dmPartnerUserId(channelId, userId) !== null;
}

export function canMarkRead(userId: number, channelId: string): boolean {
  return canAccessDmHistory(userId, channelId);
}
