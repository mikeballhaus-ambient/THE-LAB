import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
  type GameInvitePayload,
} from '@/shared/types/lab-comms-game-invite';

const WORD_TILE_APP_ID = 'app-word-tile';
import { TW_SOCKET_EVENTS } from '../../shared/types/socket-events';
import { DEFAULT_TURN_TIMER_MS } from '../../shared/types';
import { useWordTileSocket } from './useWordTileSocket';

export function useWordTileInvites(
  appServerUrl: () => string,
  sendEnvelope: (targetUserId: number, type: string, payload: Record<string, unknown>) => void,
) {
  const twSocket = useWordTileSocket();

  function ensureSocket(): void {
    twSocket.connect(appServerUrl().replace(/\/$/, ''));
  }

  async function sendGameInvite(
    inviteeId: number,
    gameId: string,
    gameName: string,
    options?: { wagerQuarks?: number },
  ): Promise<{ inviteId: string }> {
    ensureSocket();
    const data = await twSocket.emitAck<{ inviteId: string; rules: { turnTimerMs?: number; wagerQuarks?: number } }>(
      TW_SOCKET_EVENTS.INVITE_CREATE,
      {
        gameId,
        inviteeId,
        turnTimerMs: DEFAULT_TURN_TIMER_MS,
        ...(options?.wagerQuarks ? { wagerQuarks: options.wagerQuarks } : {}),
      },
    );
    const payload: GameInvitePayload = {
      appId: WORD_TILE_APP_ID,
      inviteId: data.inviteId,
      gameId,
      gameName,
      rules: data.rules,
    };
    sendEnvelope(inviteeId, LAB_COMMS_MESSAGE_TYPE_GAME_INVITE, payload);
    return { inviteId: data.inviteId };
  }

  async function acceptInviteOnServer(inviteId: string): Promise<{
    matchId: string;
    gameId: string;
    inviterId: number;
  }> {
    ensureSocket();
    return twSocket.emitAck<{ matchId: string; gameId: string; inviterId: number }>(
      TW_SOCKET_EVENTS.INVITE_ACCEPT,
      { inviteId },
    );
  }

  async function cancelGameInvite(inviteId: string, inviteeId: number): Promise<void> {
    ensureSocket();
    await twSocket.emitAck(TW_SOCKET_EVENTS.INVITE_CANCEL, { inviteId });
    sendEnvelope(inviteeId, LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL, {
      appId: WORD_TILE_APP_ID,
      inviteId,
    });
  }

  function notifyMatchReady(targetUserId: number, matchId: string, gameId: string): void {
    sendEnvelope(targetUserId, LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY, {
      appId: WORD_TILE_APP_ID,
      matchId,
      gameId,
    });
  }

  return { sendGameInvite, acceptInviteOnServer, cancelGameInvite, notifyMatchReady };
}
