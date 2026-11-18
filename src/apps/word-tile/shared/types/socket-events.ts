/** Time Wasters hybrid app — Socket.IO (app server port, not platform /lab-comms). */
export const TW_SOCKET_EVENTS = {
  MATCH_GET: 'tw:match:get',
  MATCH_CREATE_AI: 'tw:match:create-ai',
  MATCH_MOVE: 'tw:match:move',
  MATCH_STATE: 'tw:match:state',
  MATCH_AGENT_TURN: 'tw:match:agent-turn',
  MATCH_AGENT_DELTA: 'tw:match:agent-delta',
  MATCH_AGENT_DONE: 'tw:match:agent-done',
  MATCH_ERROR: 'tw:match:error',

  GAMES_LIST: 'tw:games:list',
  RUN_SUBMIT: 'tw:run:submit',
  H2H_GET: 'tw:h2h:get',

  INVITE_CREATE: 'tw:invite:create',
  INVITE_ACCEPT: 'tw:invite:accept',
  INVITE_CANCEL: 'tw:invite:cancel',
  INVITE_DECLINE: 'tw:invite:decline',
} as const;

export type TwSocketAck<T> = { success: true; data: T } | { success: false; error: string };
