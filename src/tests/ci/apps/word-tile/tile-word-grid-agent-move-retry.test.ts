import { describe, test, expect } from '@jest/globals';
import {
  placementRejectCountForStumpTurn,
  WORD_TILE_AGENT_EVALUATION,
} from '@/apps/word-tile/back-end/rules';
import { evaluateAgentAttempt } from '@/shared/game-platform/agent-loop';
import type { PlatformLlmToolFeedbackTurn } from '@/shared/types/platform-llm-completion';
import { TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID } from '@/apps/word-tile/shared/tile-word-grid-agent-move-schema';
import type { TileWordGridState } from '@/apps/word-tile/back-end/rules';

/** Word Tile's rules, driven through the kit's shared attempt evaluator. */
function evaluateProviderMoveAttempt(
  result: { content: string; toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> },
  state: TileWordGridState,
  playerSeat: number,
) {
  return evaluateAgentAttempt(result as never, state, playerSeat, WORD_TILE_AGENT_EVALUATION);
}

function emptyState(overrides?: Partial<TileWordGridState>): TileWordGridState {
  const board = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => null));
  return {
    board,
    racks: { 1: ['A', 'B', 'C'], 2: ['Q', 'U', 'I', 'Z'] },
    scores: { 1: 0, 2: 0 },
    bag: ['X', 'Y'],
    firstMove: false,
    passesInRow: 0,
    resignedSeat: null,
    premiums: null,
    turnHistory: [],
    ...overrides,
  };
}

describe('placementRejectCountForStumpTurn', () => {
  test('counts only rejected place tool args toward stumped limit', () => {
    const turns: PlatformLlmToolFeedbackTurn[] = [
      {
        toolCallId: '1',
        toolName: 'tile_word_grid_submit_move',
        arguments: JSON.stringify({ type: 'place', placements: [{ row: 1, col: 1, letter: 'A' }] }),
        resultContent: '{}',
      },
      {
        toolCallId: '2',
        toolName: 'tile_word_grid_submit_move',
        arguments: JSON.stringify({ type: 'exchange', letters: ['Q'] }),
        resultContent: '{}',
      },
    ];
    expect(placementRejectCountForStumpTurn(turns)).toBe(1);
  });
});

describe('evaluateProviderMoveAttempt', () => {
  test('asks for retry when tool args fail placement rules', () => {
    const state = emptyState();
    const outcome = evaluateProviderMoveAttempt(
      {
        content: '',
        toolCalls: [
          {
            id: '1',
            type: 'function',
            function: {
              name: TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID,
              arguments: JSON.stringify({
                type: 'place',
                placements: [{ row: 0, col: 0, letter: 'Q' }],
              }),
            },
          },
        ],
      },
      state,
      2,
    );
    expect(outcome.status).toBe('retry');
    if (outcome.status === 'retry') {
      expect(outcome.error.length).toBeGreaterThan(0);
      expect(outcome.lastToolArguments).toContain('place');
      expect(outcome.retryKind).toBe('game_rule');
    }
  });

  test('rejects place moves that include exchange letters field', () => {
    const outcome = evaluateProviderMoveAttempt(
      {
        content: '',
        toolCalls: [
          {
            id: '1',
            type: 'function',
            function: {
              name: TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID,
              arguments: JSON.stringify({
                type: 'place',
                placements: [{ row: 7, col: 6, letter: 'T' }],
                letters: ['T', 'U', 'R'],
              }),
            },
          },
        ],
      },
      emptyState(),
      2,
    );
    expect(outcome.status).toBe('retry');
    if (outcome.status === 'retry') {
      expect(outcome.retryKind).toBe('structural');
      expect(outcome.error).toContain('letters');
    }
  });

  test('accepts a legal pass when not opening turn', () => {
    const outcome = evaluateProviderMoveAttempt(
      {
        content: '',
        toolCalls: [
          {
            id: '1',
            type: 'function',
            function: {
              name: TILE_WORD_GRID_SUBMIT_MOVE_TOOL_ID,
              arguments: JSON.stringify({ type: 'pass' }),
            },
          },
        ],
      },
      emptyState(),
      2,
    );
    expect(outcome).toEqual({ status: 'ok', move: { type: 'pass' } });
  });
});
