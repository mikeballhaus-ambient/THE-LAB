/**
 * Generic lab-comms invite composable for a catalog game.
 *
 * Replaces Word Tile's `useWordTileInvites.ts`. The host passes its own
 * `sendEnvelope` (from `useLabComms`) and its platform app id.
 */
import {
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE,
  LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL,
  LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY,
  type GameInvitePayload,
} from '@/shared/types/lab-comms-game-invite';
import { useGameSocket } from './client-socket';
import type { GamePlatformConfig } from './types';

export type SendEnvelopeFn = (
  targetUserId: number,
  type: string,
  payload: Record<string, unknown>,
) => void;

export interface UseGameInvitesOptions {
  appServerUrl: () => string;
  platformAppId: string;
  config: Pick<GamePlatformConfig, 'appSlug' | 'socketEvents' | 'defaultTurnTimerMs'>;
  sendEnvelope: SendEnvelopeFn;
}

export function useGameInvites(options: UseGameInvitesOptions) {
  const { appServerUrl, platformAppId, config, sendEnvelope } = options;
  const socket = useGameSocket(config);

  function ensureSocket(): void {
    socket.connect(appServerUrl().replace(/\/$/, ''));
  }

  async function sendGameInvite(
    inviteeId: number,
    gameId: string,
    gameName: string,
    options?: {
      practice?: boolean;
      rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
      wagerQuarks?: number;
    },
  ): Promise<{ inviteId: string }> {
    ensureSocket();
    const data = await socket.emitAck<{
      inviteId: string;
      rules: {
        turnTimerMs?: number;
        practice?: boolean;
        rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
        wagerQuarks?: number;
      };
    }>(
      config.socketEvents.inviteCreate,
      {
        gameId,
        inviteeId,
        turnTimerMs: config.defaultTurnTimerMs,
        ...(options?.practice ? { practice: true } : {}),
        ...(options?.rulesProfile != null ? { rulesProfile: options.rulesProfile } : {}),
        ...(options?.wagerQuarks != null ? { wagerQuarks: options.wagerQuarks } : {}),
      },
    );
    const payload: GameInvitePayload = {
      appId: platformAppId,
      inviteId: data.inviteId,
      gameId,
      gameName,
      rules: data.rules,
    };
    sendEnvelope(inviteeId, LAB_COMMS_MESSAGE_TYPE_GAME_INVITE, payload);
    return { inviteId: data.inviteId };
  }

  async function acceptInviteOnServer(
    inviteId: string,
  ): Promise<{ matchId: string; gameId: string; inviterId: number }> {
    ensureSocket();
    return socket.emitAck(config.socketEvents.inviteAccept, { inviteId });
  }

  async function cancelGameInvite(inviteId: string, inviteeId: number): Promise<void> {
    ensureSocket();
    await socket.emitAck(config.socketEvents.inviteCancel, { inviteId });
    sendEnvelope(inviteeId, LAB_COMMS_MESSAGE_TYPE_GAME_INVITE_CANCEL, {
      appId: platformAppId,
      inviteId,
    });
  }

  function notifyMatchReady(targetUserId: number, matchId: string, gameId: string): void {
    sendEnvelope(targetUserId, LAB_COMMS_MESSAGE_TYPE_GAME_MATCH_READY, {
      appId: platformAppId,
      matchId,
      gameId,
    });
  }

  return { sendGameInvite, acceptInviteOnServer, cancelGameInvite, notifyMatchReady };
}
