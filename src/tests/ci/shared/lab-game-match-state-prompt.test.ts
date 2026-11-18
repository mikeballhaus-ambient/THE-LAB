import { describe, expect, test } from '@jest/globals';
import {
  appendLabGameMatchSnapshotToPrompt,
  formatLabGameMatchStateSections,
  stringifyMatchStateForPrompt,
} from '@/shared/game-platform/lab-assistant-banter/format-lab-game-match-state-for-prompt';
import type { LabSidecarGameMatchSnapshot } from '@/shared/composables/lab-sidecar/lab-sidecar-game-match-snapshot';

describe('stringifyMatchStateForPrompt', () => {
  test('serializes arbitrary game state', () => {
    const json = stringifyMatchStateForPrompt({ board: [[0, 1], [2, 0]], turn: 2 });
    expect(json).toContain('"board"');
    expect(json).toContain('"turn":2');
  });

  test('truncates oversized JSON', () => {
    const huge = { blob: 'x'.repeat(50_000) };
    const json = stringifyMatchStateForPrompt(huge, 1000);
    expect(json.length).toBeLessThan(1100);
    expect(json).toContain('truncated');
  });
});

describe('formatLabGameMatchStateSections', () => {
  test('includes full history and state for any catalog game shape', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'connect-four',
      matchId: 'm2',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'easy',
      yourSeat: 1,
      currentSeat: 2,
      scores: { 1: 0, 2: 0 },
      turnRemainingMs: 0,
      turnHistoryLength: 1,
      turnHistory: [{ seat: 1, summary: 'column 3' }],
      state: { grid: Array.from({ length: 6 }, () => Array(7).fill(0)), currentSeat: 2 },
    };
    const text = formatLabGameMatchStateSections(snapshot);
    expect(text).toContain('1. Human: column 3');
    expect(text).toContain('"grid"');
  });

  test('poker-holdem proactive banter omits hole cards from JSON', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'poker-holdem',
      matchId: 'm-poker',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'easy',
      yourSeat: 1,
      currentSeat: 1,
      scores: { 1: 0, 2: 0 },
      turnRemainingMs: 0,
      turnHistoryLength: 1,
      turnHistory: [{ seat: 2, summary: 'Called 25 Quarks' }],
      state: {
        holes: {
          1: [
            { rank: 'A', suit: 'd' },
            { rank: '8', suit: 's' },
          ],
          2: [
            { rank: 'K', suit: 'c' },
            { rank: 'K', suit: 'd' },
          ],
        },
        deck: [{ rank: '2', suit: 'h' }],
        board: [{ rank: '4', suit: 'd' }],
        pot: 150,
      },
    };
    const banter = formatLabGameMatchStateSections(snapshot, { proactiveBanter: true });
    expect(banter).toContain("Texas Hold'em (fog of war)");
    expect(banter).not.toContain('"rank":"K"');
    expect(banter).toContain('hidden');
    const chat = formatLabGameMatchStateSections(snapshot);
    expect(chat).toContain('"rank":"A"');
    expect(chat).not.toContain('"rank":"K"');
  });

  test('battleship redacts opponent fleet and includes tracking summary', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'battleship',
      matchId: 'm-bs',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'easy',
      yourSeat: 1,
      currentSeat: 2,
      scores: { 1: 4, 2: 5 },
      turnRemainingMs: 0,
      turnHistoryLength: 2,
      turnHistory: [
        { seat: 1, summary: 'Fired at 3,3' },
        { seat: 2, summary: 'Fired at 0,0' },
      ],
      state: {
        fleets: {
          1: [{ id: 'a', cells: [] }],
          2: [{ id: 'secret', cells: [] }],
        },
        shotsAt: {
          1: { '3,3': 'hit' },
          2: { '0,0': 'miss' },
        },
        scores: { 1: 4, 2: 5 },
      },
    };
    const text = formatLabGameMatchStateSections(snapshot);
    expect(text).toContain('### Battleship tracking');
    expect(text).toContain('do **not** read grid coords aloud');
    expect(text).not.toContain('"secret"');
    expect(text).toContain('banterNote');
  });

  test('chess includes sorted piece roster with square and type', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'chess',
      matchId: 'm3',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'easy',
      yourSeat: 1,
      currentSeat: 1,
      scores: { 1: 10, 2: 9 },
      turnRemainingMs: 0,
      turnHistoryLength: 1,
      turnHistory: [{ seat: 2, summary: 'a1→b3' }],
      state: {
        pieces: [
          { row: 7, col: 0, type: 'knight', color: 'black' },
          { row: 0, col: 3, type: 'queen', color: 'black' },
        ],
      },
    };
    const text = formatLabGameMatchStateSections(snapshot);
    expect(text).toContain('Chess piece roster');
    expect(text).toContain('a1: black knight (Lab Assistant)');
    expect(text).toContain('d8: black queen (Lab Assistant)');
    expect(text).toContain('Board grounding');
  });

  test('billiards flow — forbids race-to-8 talk while group balls remain on felt', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'billiards',
      matchId: 'm-near-8',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'boss',
      yourSeat: 1,
      currentSeat: 2,
      scores: {},
      turnRemainingMs: 0,
      turnHistoryLength: 1,
      turnHistory: [{ seat: 2, summary: 'Shot — pocketed 12' }],
      state: {
        phase: 'aim',
        rulesProfile: 'eight-ball',
        seatGroups: { 1: 'solids', 2: 'stripes' },
        balls: [
          { number: 3, pocketed: false, x: 100, y: 100 },
          { number: 8, pocketed: false, x: 200, y: 200 },
          { number: 12, pocketed: true, x: 0, y: 0 },
        ],
      },
    };
    const text = formatLabGameMatchStateSections(snapshot);
    expect(text).toContain('On felt (group balls only)');
    expect(text).toContain('solids: **3**');
    expect(text).toContain('Not yet');
    expect(text).toContain('who pockets the eight first');
  });

  test('billiards flow — sidecar identity pins solids/stripes for assistant vs human', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'billiards',
      matchId: 'm-groups',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'boss',
      yourSeat: 1,
      currentSeat: 2,
      scores: {},
      turnRemainingMs: 0,
      turnHistoryLength: 2,
      turnHistory: [
        { seat: 2, summary: 'Shot — stripes for Lab Assistant — pocketed 10 (38% power)' },
        { seat: 1, summary: 'Shot (66% power)' },
      ],
      state: {
        phase: 'aim',
        rulesProfile: 'eight-ball',
        seatGroups: { 1: 'solids', 2: 'stripes' },
        balls: [{ number: 10, pocketed: true, x: 0, y: 0 }],
      },
    };
    const text = formatLabGameMatchStateSections(snapshot);
    expect(text).toContain('Sidecar identity');
    expect(text).toContain('Lab Assistant** → **stripes');
    expect(text).toContain('Human → **solids');
    expect(text).toContain('swapping groups in one sentence');
  });

  test('billiards flow — match result when frame finished', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'billiards',
      matchId: 'm-over',
      status: 'finished',
      opponentKind: 'ai',
      difficulty: 'boss',
      yourSeat: 1,
      currentSeat: 1,
      scores: {},
      turnRemainingMs: 0,
      turnHistoryLength: 3,
      turnHistory: [{ seat: 2, summary: 'Early 8 — lose' }],
      state: {
        phase: 'finished',
        rulesProfile: 'eight-ball',
        seatGroups: { 1: 'stripes', 2: 'solids' },
        winnerSeat: 1,
        balls: [{ number: 8, pocketed: true, x: 0, y: 0 }],
      },
    };
    const text = formatLabGameMatchStateSections(snapshot);
    expect(text).toContain('Match result (FINISHED)');
    expect(text).toContain('**lost**');
  });

  test('billiards flow clarifies human places their own cue on ball in hand', () => {
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'billiards',
      matchId: 'm-bih',
      status: 'active',
      opponentKind: 'ai',
      difficulty: 'boss',
      yourSeat: 1,
      currentSeat: 1,
      scores: {},
      turnRemainingMs: 0,
      turnHistoryLength: 1,
      turnHistory: [{ seat: 2, summary: 'Scratch — ball in hand' }],
      state: {
        phase: 'place_cue',
        ballInHand: true,
        ballInHandSeat: 1,
        placementZone: 'kitchen',
        balls: [],
      },
    };
    const text = formatLabGameMatchStateSections(snapshot);
    expect(text).toContain('their own');
    expect(text).toContain('kitchen');
    expect(text).toContain('Lab Assistant waits');
  });

  test('appendLabGameMatchSnapshotToPrompt places state before reply instruction', () => {
    const base = `### Voice\nTalk.\n\nReply with exactly **one** short spoken sentence.`;
    const snapshot: LabSidecarGameMatchSnapshot = {
      gameId: 'chess',
      matchId: 'm',
      status: 'active',
      opponentKind: 'ai',
      difficulty: null,
      yourSeat: 1,
      currentSeat: 1,
      scores: {},
      turnRemainingMs: 0,
      turnHistoryLength: 0,
      turnHistory: [],
      state: { pieces: [] },
    };
    const out = appendLabGameMatchSnapshotToPrompt(base, snapshot);
    const replyIdx = out.indexOf('Reply with exactly');
    const rosterIdx = out.indexOf('Board grounding');
    expect(rosterIdx).toBeGreaterThan(-1);
    expect(replyIdx).toBeGreaterThan(rosterIdx);
  });
});
