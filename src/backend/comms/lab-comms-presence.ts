import type { LabPresenceStatus, UserPresenceState } from '@/shared/types/lab-comms';
import { LAB_COMMS_PRESENCE_IDLE_MS } from '@/shared/types/lab-comms';

type PresenceRecord = {
  socketIds: Set<string>;
  lastActivityAt: number;
};

const byUserId = new Map<number, PresenceRecord>();

export function touchPresence(userId: number, socketId: string): void {
  let record = byUserId.get(userId);
  if (!record) {
    record = { socketIds: new Set(), lastActivityAt: Date.now() };
    byUserId.set(userId, record);
  }
  record.socketIds.add(socketId);
  record.lastActivityAt = Date.now();
}

export function removePresenceSocket(userId: number, socketId: string): void {
  const record = byUserId.get(userId);
  if (!record) {
    return;
  }
  record.socketIds.delete(socketId);
  if (record.socketIds.size === 0) {
    byUserId.delete(userId);
  }
}

export function recordActivity(userId: number): void {
  const record = byUserId.get(userId);
  if (record) {
    record.lastActivityAt = Date.now();
  }
}

export function presenceStatusForUser(userId: number, now = Date.now()): LabPresenceStatus {
  const record = byUserId.get(userId);
  if (!record || record.socketIds.size === 0) {
    return 'red';
  }
  if (now - record.lastActivityAt >= LAB_COMMS_PRESENCE_IDLE_MS) {
    return 'yellow';
  }
  return 'green';
}

export function presenceStateForUser(userId: number): UserPresenceState {
  const record = byUserId.get(userId);
  return {
    userId,
    status: presenceStatusForUser(userId),
    lastActivityAt: record ? new Date(record.lastActivityAt).toISOString() : null,
  };
}

export function allPresenceStates(): UserPresenceState[] {
  return [...byUserId.keys()].map((userId) => presenceStateForUser(userId));
}

/** Test helper */
export function resetLabCommsPresence(): void {
  byUserId.clear();
}
