import {
  GAME_APP_INVITE_REGISTRY,
  DEFAULT_LEGACY_GAME_APP_ID,
  resolveGameAppIdFromInvitePayload,
  resolveGameAppInviteEntry,
} from '@/shared/config/game-app-invite-registry';
import {
  GameInvitePayloadSchema,
  validateGameInviteEnvelopePayload,
} from '@/shared/types/schemas/lab-comms-game-invite-schema';
import {
  clearPlatformStructuralToolsForTests,
  platformStructuralToolSuppressesReasoning,
  registerDefaultPlatformStructuralTools,
} from '@/backend/ai/structural-tools/platform-structural-tool-registry';
import { LAB_COMMS_MESSAGE_TYPE_GAME_INVITE } from '@/shared/types/lab-comms-game-invite';

describe('game platform decoupling', () => {
  beforeEach(() => {
    clearPlatformStructuralToolsForTests();
    registerDefaultPlatformStructuralTools();
  });

  test('invite registry serves word-tile', () => {
    expect(GAME_APP_INVITE_REGISTRY['app-word-tile']?.displayName).toBe('Word Tile');
    expect(GAME_APP_INVITE_REGISTRY['app-tic-tac-toe']?.displayName).toBe('Tic-Tac-Toe');
    expect(resolveGameAppInviteEntry('app-word-tile')?.socketEvents.inviteAccept).toBe(
      'tw:invite:accept',
    );
  });

  test('resolveGameAppIdFromInvitePayload defaults absent appId to word-tile', () => {
    expect(resolveGameAppIdFromInvitePayload({})).toBe(DEFAULT_LEGACY_GAME_APP_ID);
    expect(DEFAULT_LEGACY_GAME_APP_ID).toBe('app-word-tile');
    expect(resolveGameAppIdFromInvitePayload({ appId: 'app-word-tile' })).toBe('app-word-tile');
  });

  test('game invite envelope round-trip', () => {
    const payload = {
      appId: 'app-word-tile',
      inviteId: '11111111-1111-4111-8111-111111111111',
      gameId: 'tile-word-grid',
      gameName: 'Word tile',
    };
    expect(GameInvitePayloadSchema.safeParse(payload).success).toBe(true);
    const validated = validateGameInviteEnvelopePayload(
      LAB_COMMS_MESSAGE_TYPE_GAME_INVITE,
      payload,
    );
    expect(validated.ok).toBe(true);
  });

  test('structural tool suppresses reasoning for the word-tile purpose prefix', () => {
    expect(platformStructuralToolSuppressesReasoning('word-tile.tile-word-grid.agent-turn')).toBe(
      true,
    );
    expect(platformStructuralToolSuppressesReasoning('other-app.some-turn')).toBe(false);
  });
});
