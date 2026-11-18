/** Socket.IO event names for `/lab-comms` namespace (not Lab Assistant chat). */
export const LAB_COMMS_EVENTS = {
  SUBSCRIBE: 'comms:subscribe',
  UNSUBSCRIBE: 'comms:unsubscribe',
  SEND: 'comms:send',
  SEND_ENVELOPE: 'comms:send:envelope',
  MESSAGE: 'comms:message',
  HISTORY_REQUEST: 'comms:history:request',
  HISTORY_RESPONSE: 'comms:history:response',
  CHANNELS_REQUEST: 'comms:channels:request',
  CHANNELS_RESPONSE: 'comms:channels:response',
  MARK_READ: 'comms:mark-read',
  CLEAR_HISTORY: 'comms:history:clear',
  CLEAR_HISTORY_RESPONSE: 'comms:history:clear:response',
  UNREAD_SUMMARY: 'comms:unread:summary',
  ACTIVITY: 'comms:activity',
  PRESENCE_SNAPSHOT: 'comms:presence:snapshot',
  PRESENCE_UPDATE: 'comms:presence:update',
  ERROR: 'comms:error',
  /** Ephemeral Time Wasters match view (not stored in lab_comms_messages). */
  MATCH_STATE: 'comms:match:state',
} as const;

export type LabCommsEventName = (typeof LAB_COMMS_EVENTS)[keyof typeof LAB_COMMS_EVENTS];
