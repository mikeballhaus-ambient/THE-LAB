import { describe, expect, test } from '@jest/globals';
import {
  buildLabGameUserChatContextBlock,
  enrichChatMessagesWithLabGameSnapshot,
  labSidecarGameSnapshotMatchesContext,
} from '@/shared/composables/lab-sidecar/build-lab-game-user-chat-context';
import type { LabSidecarGameMatchSnapshot } from '@/shared/composables/lab-sidecar/lab-sidecar-game-match-snapshot';
import {
  LAB_SIDECAR_GAME_VIEW_PLAY,
  LAB_SIDECAR_HOST_CTX_GAME_ID,
  LAB_SIDECAR_HOST_CTX_GAME_VIEW,
  LAB_SIDECAR_HOST_CTX_MATCH_ID,
} from '@/shared/constants/lab-game-assistant-opponent';

const sampleSnapshot: LabSidecarGameMatchSnapshot = {
  gameId: 'chess',
  matchId: 'match-1',
  status: 'active',
  opponentKind: 'ai',
  difficulty: 'medium',
  yourSeat: 1,
  currentSeat: 1,
  scores: { 1: 0, 2: 0 },
  turnRemainingMs: 120_000,
  turnHistoryLength: 4,
  turnHistory: [
    { seat: 1, summary: 'e4' },
    { seat: 2, summary: 'e5' },
    { seat: 1, summary: 'Nf3' },
    { seat: 2, summary: 'Nc6' },
  ],
  lastTurn: { seat: 2, summary: 'Nc6' },
  state: { pieces: [{ id: 'w-k', type: 'king', color: 'white', file: 5, rank: 1 }] },
};

describe('buildLabGameUserChatContextBlock', () => {
  test('includes display name in metadata and turn history', () => {
    const named = { ...sampleSnapshot, humanDisplayName: 'Alex' };
    const block = buildLabGameUserChatContextBlock(named);
    expect(block).toContain('Alex (Lab user display name)');
    expect(block).toContain('Last move: Lab Assistant — Nc6');
    expect(block).toContain('On the clock: Alex');
    expect(block).toContain('1. Alex: e4');
    expect(block).toContain('Forbidden in your reply');
    expect(block).toContain('do **not** put their Lab profile display name in every reply');
    expect(block).toContain('### Game state (JSON');
    expect(block).toContain('"pieces"');
  });

  test('billiards finished frame tells Sidecar the assistant lost', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      ...sampleSnapshot,
      gameId: 'billiards',
      status: 'finished',
      yourSeat: 1,
      state: {
        phase: 'finished',
        winnerSeat: 1,
        seatGroups: { 1: 'stripes', 2: 'solids' },
      },
    };
    const block = buildLabGameUserChatContextBlock(snapshot);
    expect(block).toContain('MATCH OVER');
    expect(block).toContain('**lost**');
  });
});

describe('labSidecarGameSnapshotMatchesContext', () => {
  test('matches active play host context', () => {
    const ok = labSidecarGameSnapshotMatchesContext(sampleSnapshot, {
      viewMode: 'single_app',
      visibleAppIds: ['chess'],
      focusedAppId: 'chess',
      hostContext: {
        [LAB_SIDECAR_HOST_CTX_GAME_VIEW]: LAB_SIDECAR_GAME_VIEW_PLAY,
        [LAB_SIDECAR_HOST_CTX_GAME_ID]: 'chess',
        [LAB_SIDECAR_HOST_CTX_MATCH_ID]: 'match-1',
      },
    });
    expect(ok).toBe(true);
  });

  test('rejects mismatched match id', () => {
    const ok = labSidecarGameSnapshotMatchesContext(sampleSnapshot, {
      viewMode: 'single_app',
      visibleAppIds: ['chess'],
      focusedAppId: 'chess',
      hostContext: {
        [LAB_SIDECAR_HOST_CTX_GAME_VIEW]: LAB_SIDECAR_GAME_VIEW_PLAY,
        [LAB_SIDECAR_HOST_CTX_GAME_ID]: 'chess',
        [LAB_SIDECAR_HOST_CTX_MATCH_ID]: 'other',
      },
    });
    expect(ok).toBe(false);
  });
});

describe('enrichChatMessagesWithLabGameSnapshot', () => {
  test('appends snapshot to last user turn only', () => {
    const messages = enrichChatMessagesWithLabGameSnapshot(
      [
        { role: 'assistant', content: 'hi' },
        { role: 'user', content: 'what should I play?' },
      ],
      'what should I play?',
      sampleSnapshot,
    );
    expect(messages[0].content).toBe('hi');
    expect(String(messages[1].content)).toContain('what should I play?');
    expect(String(messages[1].content)).toContain('[Live match context');
  });
});
