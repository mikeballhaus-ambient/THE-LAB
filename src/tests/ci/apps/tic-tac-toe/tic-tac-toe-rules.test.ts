import { describe, expect, test } from '@jest/globals';
import {
  BOARD_SIZE,
  WIN_LINES,
  applyMove,
  availableMoves,
  createInitialState,
  isBoardFull,
  parseMove,
  validateMove,
  winnerOf,
  type TicTacToeState,
} from '@/apps/tic-tac-toe/back-end/rules';
import { ticTacToeAdapter } from '@/apps/tic-tac-toe/back-end/adapter';
import { TIC_TAC_TOE_GAME_IDS } from '@/apps/tic-tac-toe/back-end/catalog';
import { TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID } from '@/apps/tic-tac-toe/shared/tic-tac-toe-agent-move-schema';

describe('tic-tac-toe rules', () => {
  test('initial state is empty, seat 1 to move by default, not finished', () => {
    const s = createInitialState();
    expect(s.board).toHaveLength(BOARD_SIZE);
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.currentSeat).toBe(1);
    expect(s.finished).toBe(false);
    expect(s.winnerSeat).toBeNull();
    expect(s.moveCount).toBe(0);
  });

  test('createInitialState honors startingSeat when the kit coin-flips the opener', () => {
    const s = createInitialState({ startingSeat: 2 });
    expect(s.currentSeat).toBe(2);
    expect(validateMove(s, { type: 'place', index: 4 }, 2)).toEqual({ ok: true });
  });

  test('there are exactly 8 winning lines', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  test('a move claims the cell and flips the turn', () => {
    const s = applyMove(createInitialState(), { type: 'place', index: 4 });
    expect(s.board[4]).toBe(1);
    expect(s.currentSeat).toBe(2);
    expect(s.moveCount).toBe(1);
  });

  test('rejects an occupied cell', () => {
    const s = applyMove(createInitialState(), { type: 'place', index: 4 });
    expect(validateMove(s, { type: 'place', index: 4 }, 2)).toEqual({
      ok: false,
      error: 'Cell 4 is already taken',
    });
  });

  test('rejects an off-turn seat', () => {
    const s = createInitialState();
    expect(validateMove(s, { type: 'place', index: 0 }, 2)).toEqual({
      ok: false,
      error: "Not seat 2's turn",
    });
  });

  test('rejects any move once finished', () => {
    const finished: TicTacToeState = { ...createInitialState(), finished: true };
    expect(validateMove(finished, { type: 'place', index: 0 }, 1)).toEqual({
      ok: false,
      error: 'Match is already finished',
    });
  });

  test('parseMove rejects out-of-range and junk input', () => {
    expect(parseMove({ index: 9 })).toBeNull();
    expect(parseMove({ index: -1 })).toBeNull();
    expect(parseMove({ index: 1.5 })).toBeNull();
    expect(parseMove(null)).toBeNull();
    expect(parseMove({ index: '3' })).toEqual({ type: 'place', index: 3 });
  });

  test('detects a row win for seat 1', () => {
    let s = createInitialState();
    s = applyMove(s, { type: 'place', index: 0 }); // seat 1
    s = applyMove(s, { type: 'place', index: 3 }); // seat 2
    s = applyMove(s, { type: 'place', index: 1 }); // seat 1
    s = applyMove(s, { type: 'place', index: 4 }); // seat 2
    s = applyMove(s, { type: 'place', index: 2 }); // seat 1 -> row 0,1,2
    expect(s.winnerSeat).toBe(1);
    expect(s.finished).toBe(true);
  });

  test('detects a diagonal win for seat 2', () => {
    // Cells 2, 4, 6 form the anti-diagonal.
    const board = [1, 1, 2, 1, 2, null, 2, null, null] as const;
    expect(winnerOf([...board])).toBe(2);
  });

  test('detects a draw when the board fills with no line', () => {
    // X O X / X O O / O X X  -> no three in a row
    const board = [1, 2, 1, 1, 2, 2, 2, 1, 1] as const;
    expect(winnerOf([...board])).toBeNull();
    expect(isBoardFull([...board])).toBe(true);
  });

  test('availableMoves lists only empty cells', () => {
    const s = applyMove(createInitialState(), { type: 'place', index: 0 });
    expect(availableMoves(s.board)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('tic-tac-toe adapter', () => {
  test('declares the catalog game id', () => {
    expect(ticTacToeAdapter.gameId).toBe(TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE);
  });

  test('createInitialState matches the rules module when no starting seat', () => {
    const state = ticTacToeAdapter.createInitialState({
      gameId: TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE,
      opponentKind: 'ai',
      player1Id: 1,
      player2Id: 2,
    });
    expect(state).toEqual(createInitialState());
  });

  test('createInitialState syncs currentSeat with kit startingSeat', () => {
    const state = ticTacToeAdapter.createInitialState({
      gameId: TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE,
      opponentKind: 'ai',
      player1Id: 1,
      player2Id: 2,
      startingSeat: 2,
    });
    expect(state).toEqual(createInitialState({ startingSeat: 2 }));
    expect(ticTacToeAdapter.validateMove(state, { index: 4 }, 2)).toEqual({ ok: true });
  });

  test('validateMove / applyMove / isFinished / winnerSeat round-trip', () => {
    let state: unknown = ticTacToeAdapter.createInitialState({
      gameId: TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE,
      opponentKind: 'ai',
      player1Id: 1,
      player2Id: 2,
    });

    expect(ticTacToeAdapter.validateMove(state, { index: 0 }, 1)).toEqual({ ok: true });
    state = ticTacToeAdapter.applyMove(state, { index: 0 }, 1);
    expect(ticTacToeAdapter.validateMove(state, { index: 0 }, 2).ok).toBe(false);

    expect(ticTacToeAdapter.isFinished(state)).toBe(false);
    expect(ticTacToeAdapter.winnerSeat(state)).toBeNull();
    expect(ticTacToeAdapter.scores(state)).toEqual({ 1: 1, 2: 0 });
  });

  test('agentMoveAsync retries then throws rather than inventing a move when the model gives junk', async () => {
    const state = ticTacToeAdapter.createInitialState({
      gameId: TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE,
      opponentKind: 'ai',
      player1Id: 1,
      player2Id: 2,
    });
    let calls = 0;
    await expect(
      ticTacToeAdapter.agentMoveAsync?.(state, 'medium', 2, {
        complete: async () => {
          calls += 1;
          return { content: 'I cannot help with that.' };
        },
      } as never),
    ).rejects.toThrow(/could not produce a legal move after retries/i);
    // The kit agent loop gives the model more than one chance before failing.
    expect(calls).toBeGreaterThan(1);
  });

  test('agentMoveAsync returns a legal cell when the model calls the tool', async () => {
    const state = ticTacToeAdapter.createInitialState({
      gameId: TIC_TAC_TOE_GAME_IDS.TIC_TAC_TOE,
      opponentKind: 'ai',
      player1Id: 1,
      player2Id: 2,
    });
    let request: { structuralTool?: string } | undefined;
    const move = await ticTacToeAdapter.agentMoveAsync?.(state, 'medium', 2, {
      complete: async (req: { structuralTool?: string }) => {
        request = req;
        return {
          content: '',
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: { name: TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID, arguments: '{"index":4}' },
            },
          ],
        };
      },
    } as never);
    expect(move).toEqual({ type: 'place', index: 4 });
    // The game now drives a structural tool, not prose.
    expect(request?.structuralTool).toBe(TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID);
  });

  test('a rejected cell is replayed to the model with the reason', async () => {
    // Seat 1 has already claimed cell 0, so a retry on 0 must be refused.
    const state = applyMove(createInitialState(), { type: 'place', index: 0 });
    const requests: Array<{ toolFeedbackTurns?: { resultContent: string }[] }> = [];
    const move = await ticTacToeAdapter.agentMoveAsync?.(state, 'medium', 2, {
      complete: async (req: never) => {
        requests.push(req);
        const index = requests.length === 1 ? 0 : 4;
        return {
          content: '',
          toolCalls: [
            {
              id: `call-${requests.length}`,
              type: 'function',
              function: {
                name: TIC_TAC_TOE_SUBMIT_MOVE_TOOL_ID,
                arguments: `{"index":${index}}`,
              },
            },
          ],
        };
      },
    } as never);
    expect(move).toEqual({ type: 'place', index: 4 });
    // Cell 0 is occupied by seat 1, so the retry must say so.
    expect(requests[1]?.toolFeedbackTurns?.[0]?.resultContent).toContain('already occupied');
  });
});
