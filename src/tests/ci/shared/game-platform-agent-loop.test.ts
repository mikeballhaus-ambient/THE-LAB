import { describe, expect, test } from '@jest/globals';
import {
  evaluateAgentAttempt,
  runAgentMoveLoop,
  type AgentLoopGame,
} from '@/shared/game-platform/agent-loop';
import { createTurnBasedAdapter } from '@/shared/game-platform/create-adapter';
import type { PlatformAgentTurnDeps } from '@/shared/types/platform-agent-turn';
import type { PlatformLlmCompletionResult } from '@/shared/types/platform-llm-completion';
import type { GameDifficulty, ValidateMoveResult } from '@/shared/game-platform/types';

/**
 * Contract tests for the shared structural-tool agent loop.
 *
 * These pin the behaviour every LLM-backed game depends on: validate, feed the
 * rejection back, retry, and **throw** when exhausted — never substitute a move.
 */

const TOOL = 'demo_submit_move';

/** Minimal game: a move is the integer cell index, and 3 is the only illegal cell. */
interface DemoState {
  calls: number;
}

const demoGame: AgentLoopGame<DemoState, { index: number }> = {
  purpose: 'demo.demo.agent-turn',
  structuralToolId: TOOL,
  systemPrompt: 'SYS',
  temperatureFor: () => 0.2,
  buildUserPrompt: ({ attempt }) => `USER attempt ${attempt}`,
  parseMove: (raw) => {
    if (typeof raw !== 'object' || raw == null) {
      throw new Error('Move must be an object');
    }
    const index = (raw as { index?: unknown }).index;
    if (typeof index !== 'number') {
      throw new Error('Move must include a numeric index');
    }
    if (index === 3) {
      throw new Error('Cell 3 is occupied');
    }
    return { index };
  },
};

type Deps = PlatformAgentTurnDeps & { requests: unknown[] };

function fakeDeps(
  replies: Array<Partial<PlatformLlmCompletionResult> & { content: string }>,
): Deps {
  const requests: unknown[] = [];
  let i = 0;
  return {
    requests,
    complete: async (request: unknown) => {
      requests.push(request);
      const reply = replies[Math.min(i, replies.length - 1)]!;
      i += 1;
      return { model: 'm', provider: 'p', ...reply };
    },
  } as never;
}

function toolCall(args: unknown, name = TOOL) {
  return {
    id: `call-${name}`,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  };
}

describe('runAgentMoveLoop — structural tool path', () => {
  test('returns the validated move on the first legal attempt', async () => {
    const deps = fakeDeps([{ content: '', toolCalls: [toolCall({ index: 5 })] as never }]);
    const move = await runAgentMoveLoop<DemoState, { index: number }>(
      { calls: 0 },
      'medium',
      1,
      deps,
      demoGame,
    );
    expect(move).toEqual({ index: 5 });
    expect(deps.requests).toHaveLength(1);
  });

  test('feeds a rule rejection back and retries, then succeeds', async () => {
    const deps = fakeDeps([
      { content: '', toolCalls: [toolCall({ index: 3 })] as never },
      { content: '', toolCalls: [toolCall({ index: 7 })] as never },
    ]);
    const move = await runAgentMoveLoop<DemoState, { index: number }>(
      { calls: 0 },
      'hard',
      1,
      deps,
      demoGame,
    );
    expect(move).toEqual({ index: 7 });
    expect(deps.requests).toHaveLength(2);

    // Second request must carry the rejection as real tool feedback.
    const retry = deps.requests[1] as {
      toolFeedbackTurns?: Array<{ resultContent: string }>;
    };
    expect(retry.toolFeedbackTurns).toHaveLength(1);
    expect(retry.toolFeedbackTurns?.[0]?.resultContent).toContain('Cell 3 is occupied');
  });

  test('raises the temperature on retry so the model does not repeat itself', async () => {
    const deps = fakeDeps([
      { content: '', toolCalls: [toolCall({ index: 3 })] as never },
      { content: '', toolCalls: [toolCall({ index: 4 })] as never },
    ]);
    await runAgentMoveLoop<DemoState, { index: number }>(
      { calls: 0 },
      'easy',
      1,
      deps,
      demoGame,
    );
    const [first, second] = deps.requests as Array<{ temperature: number }>;
    expect(second!.temperature).toBeGreaterThan(first!.temperature);
  });

  test('throws (no fallback) when rule rejections exhaust the API rounds', async () => {
    const deps = fakeDeps([{ content: '', toolCalls: [toolCall({ index: 3 })] as never }]);
    await expect(
      runAgentMoveLoop<DemoState, { index: number }>({ calls: 0 }, 'medium', 1, deps, {
        ...demoGame,
        limits: { maxApiRounds: 3 },
      }),
    ).rejects.toThrow(/no.*legal move after retries|after retries/i);
  });

  test('throws after the structural round cap (wrong tool name every time)', async () => {
    const deps = fakeDeps([
      { content: '', toolCalls: [toolCall({ index: 1 }, 'wrong_tool')] as never },
    ]);
    await expect(
      runAgentMoveLoop<DemoState, { index: number }>({ calls: 0 }, 'medium', 1, deps, demoGame),
    ).rejects.toThrow(/retries/i);
  });

  test('abortAfter ends the turn early with a game-supplied reason', async () => {
    const deps = fakeDeps([{ content: '', toolCalls: [toolCall({ index: 3 })] as never }]);
    await expect(
      runAgentMoveLoop<DemoState, { index: number }>({ calls: 0 }, 'medium', 1, deps, {
        ...demoGame,
        abortAfter: (turns) => (turns.length >= 2 ? 'stumped on placements' : null),
      }),
    ).rejects.toThrow(/stumped on placements/);
  });
});

describe('runAgentMoveLoop — prose-only path', () => {
  const proseGame: AgentLoopGame<DemoState, { index: number }> = {
    ...demoGame,
    structuralToolId: undefined,
    retryUserHint: ({ lastRejection }) => `REJECTED: ${lastRejection}`,
    parseMove: (raw) => {
      const n = Number.parseInt(String(raw).match(/\d+/)?.[0] ?? '', 10);
      if (!Number.isFinite(n)) {
        throw new Error('Reply did not contain a number');
      }
      if (n === 3) {
        throw new Error('Cell 3 is occupied');
      }
      return { index: n };
    },
  };

  test('accepts a plain-text reply as the move (no tool required)', async () => {
    const deps = fakeDeps([{ content: 'I choose 6' }]);
    const move = await runAgentMoveLoop<DemoState, { index: number }>(
      { calls: 0 },
      'medium',
      1,
      deps,
      proseGame,
    );
    expect(move).toEqual({ index: 6 });
    const request = deps.requests[0] as { structuralTool?: string };
    expect(request.structuralTool).toBeUndefined();
  });

  test('retries a prose reply that names an illegal cell', async () => {
    const deps = fakeDeps([{ content: '3' }, { content: '8' }]);
    const move = await runAgentMoveLoop<DemoState, { index: number }>(
      { calls: 0 },
      'medium',
      1,
      deps,
      proseGame,
    );
    expect(move).toEqual({ index: 8 });
    expect(deps.requests).toHaveLength(2);
  });

  test('never sends toolFeedbackTurns — there is no tool to replay', async () => {
    const deps = fakeDeps([{ content: 'junk' }, { content: '8' }]);
    await runAgentMoveLoop<DemoState, { index: number }>(
      { calls: 0 },
      'medium',
      1,
      deps,
      proseGame,
    );
    const retry = deps.requests[1] as { toolFeedbackTurns?: unknown[]; structuralTool?: string };
    // A `tool_calls`/`role:tool` pair for an undeclared tool is a malformed request:
    // strict OpenAI-compatible providers reject it, lenient ones are told a falsehood.
    expect(retry.toolFeedbackTurns).toBeUndefined();
    expect(retry.structuralTool).toBeUndefined();
  });

  test('still surfaces the rejection to the model via the user prompt', async () => {
    const deps = fakeDeps([{ content: 'junk' }, { content: '8' }]);
    await runAgentMoveLoop<DemoState, { index: number }>(
      { calls: 0 },
      'medium',
      1,
      deps,
      proseGame,
    );
    const retry = deps.requests[1] as { retryUserHint?: string };
    // The reason travels in the user message now — the only channel a prose game has.
    expect(retry.retryUserHint).toContain('REJECTED');
    expect(retry.retryUserHint).toContain('Reply did not contain a number');
  });
});

describe('createTurnBasedAdapter agent path uses the shared loop', () => {
  const rules = {
    createInitialState: () => ({ calls: 0 }),
    parseMove: (move: unknown) => {
      const index = (move as { index?: unknown } | null)?.index;
      return typeof index === 'number' ? { index } : null;
    },
    validate: (): ValidateMoveResult => ({ ok: true }),
    apply: (state: DemoState) => ({ calls: state.calls + 1 }),
    scores: () => ({ 1: 0, 2: 0 }),
    isFinished: () => false,
    winnerSeat: () => null,
    onTimeout: (state: DemoState) => state,
  };

  test('a prose adapter retries a bad reply instead of failing the turn', async () => {
    const replies = ['no number here', '9'];
    let i = 0;
    const deps = {
      complete: async () => ({
        content: replies[Math.min(i++, replies.length - 1)]!,
        model: 'm',
        provider: 'p',
      }),
    } as never;

    const adapter = createTurnBasedAdapter<DemoState, { index: number }>({
      gameId: 'demo',
      rules,
      agent: {
        purpose: 'demo.demo.agent-turn',
        systemPrompt: 'SYS',
        buildUserPrompt: () => 'USER',
        parseAgentReply: (content: string) => {
          const n = Number.parseInt(content.match(/\d+/)?.[0] ?? '', 10);
          return Number.isFinite(n) ? { index: n } : null;
        },
      },
    });

    const move = await adapter.agentMoveAsync?.(
      { calls: 0 },
      'medium' as GameDifficulty,
      1,
      deps,
    );
    expect(move).toEqual({ index: 9 });
    expect(i).toBe(2);
  });

  test('still throws when every reply is unusable', async () => {
    const deps = {
      complete: async () => ({ content: 'still no number', model: 'm', provider: 'p' }),
    } as never;

    const adapter = createTurnBasedAdapter<DemoState, { index: number }>({
      gameId: 'demo',
      rules,
      agent: {
        purpose: 'demo.demo.agent-turn',
        systemPrompt: 'SYS',
        buildUserPrompt: () => 'USER',
        parseAgentReply: () => null,
      },
    });

    await expect(
      adapter.agentMoveAsync?.({ calls: 0 }, 'medium' as GameDifficulty, 1, deps),
    ).rejects.toThrow(/retries/i);
  });
});

describe('evaluateAgentAttempt', () => {
  test('classifies a wrong tool name as structural', () => {
    const outcome = evaluateAgentAttempt(
      { content: '', toolCalls: [toolCall({ index: 1 }, 'other_tool')] as never },
      { calls: 0 },
      1,
      demoGame,
    );
    expect(outcome.status).toBe('retry');
    if (outcome.status === 'retry') {
      expect(outcome.retryKind).toBe('structural');
    }
  });

  test('classifies a rule failure as a game_rule retry', () => {
    const outcome = evaluateAgentAttempt(
      { content: '', toolCalls: [toolCall({ index: 3 })] as never },
      { calls: 0 },
      1,
      demoGame,
    );
    expect(outcome.status).toBe('retry');
    if (outcome.status === 'retry') {
      expect(outcome.retryKind).toBe('game_rule');
      expect(outcome.lastToolArguments).toBeDefined();
    }
  });

  test('parses a move emitted as assistant text instead of a tool call', () => {
    const outcome = evaluateAgentAttempt(
      { content: '{"index":2}' },
      { calls: 0 },
      1,
      demoGame,
    );
    expect(outcome).toEqual({ status: 'ok', move: { index: 2 } });
  });
});
