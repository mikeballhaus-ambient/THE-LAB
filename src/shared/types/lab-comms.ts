/** Lab messaging channel identifiers (see plans/messaging/architecture.md). */
export type DmChannelId = `dm:${number}:${number}`;
export type UserInboxChannelId = `user:${number}`;
export type RoomChannelId = `room:${string}`;

export type LabChannelId = DmChannelId | UserInboxChannelId | RoomChannelId;

export const LAB_COMMS_MESSAGE_TYPE_DM_TEXT = 'dm.text';

export type DmTextPayload = {
  text: string;
};

export type LabEnvelope = {
  id: string;
  channelId: LabChannelId;
  type: string;
  senderUserId: number;
  sentAt: string;
  payload: Record<string, unknown>;
  replyTo?: string;
};

export type LabPresenceStatus = 'green' | 'yellow' | 'red';

export type UserPresenceState = {
  userId: number;
  status: LabPresenceStatus;
  lastActivityAt: string | null;
};

/**
 * What kind of actor is on the other end of a DM.
 *
 * `automation` is a first-class feature, not a user who happens to hold a reserved id: the thread is
 * read-only and rendered as a notification feed. Messages reads this field instead of comparing the
 * partner id against `LAB_PLATFORM_SYSTEM_USER_ID`, so the reserved id is no longer load-bearing for the
 * UI and a future second automation actor needs no new constant-check anywhere.
 */
export type LabCommsPartnerKind = 'user' | 'automation';

export type LabDmChannelSummary = {
  channelId: DmChannelId;
  partnerUserId: number;
  partnerKind: LabCommsPartnerKind;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type LabUnreadSummary = {
  total: number;
  byPartnerId: Record<number, number>;
};

export const LAB_COMMS_MAX_MESSAGE_LENGTH = 4000;

export const LAB_COMMS_PRESENCE_IDLE_MS = 10 * 60 * 1000;

export * from './lab-comms-tw';
