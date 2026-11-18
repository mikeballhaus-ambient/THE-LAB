import { describe, expect, test } from '@jest/globals';
import {
  AGENT_DIFFICULTY_TEMPERATURE,
  DEFAULT_AGENT_LLM_SAMPLING,
  agentDifficultyLine,
  agentTemperature,
  baseDifficultyGuidance,
  buildAgentDifficultySection,
  buildAgentSystemPrompt,
  formatDifficultyUserLine,
} from '@/shared/game-platform/difficulty-policy';
import type { GameDifficulty } from '@/shared/game-platform/types';

const TIERS: GameDifficulty[] = ['easy', 'medium', 'hard', 'boss'];

/**
 * Contract tests for the shared vs-AI difficulty policy.
 *
 * The point of this module is that a tier means the same thing everywhere and
 * that temperature is monotonic. Both were violated before consolidation: seven
 * adapters hard-coded `difficulty === 'boss' ? 0.1 : 0.3`, collapsing
 * easy/medium/hard into a single identical temperature.
 */
describe('AGENT_DIFFICULTY_TEMPERATURE', () => {
  test('every tier has a temperature', () => {
    for (const tier of TIERS) {
      expect(typeof AGENT_DIFFICULTY_TEMPERATURE[tier]).toBe('number');
    }
  });

  test('temperature strictly decreases as difficulty rises', () => {
    const values = TIERS.map((t) => AGENT_DIFFICULTY_TEMPERATURE[t]);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]!).toBeLessThan(values[i - 1]!);
    }
  });

  test('tiers are not collapsed into one value', () => {
    expect(new Set(TIERS.map((t) => AGENT_DIFFICULTY_TEMPERATURE[t])).size).toBe(4);
  });

  test('agentTemperature reads the table', () => {
    for (const tier of TIERS) {
      expect(agentTemperature(tier)).toBe(AGENT_DIFFICULTY_TEMPERATURE[tier]);
    }
  });

  test('sampling is a narrow nucleus and sets no penalties', () => {
    expect(DEFAULT_AGENT_LLM_SAMPLING.top_p).toBeGreaterThan(0.5);
    expect(DEFAULT_AGENT_LLM_SAMPLING.top_p).toBeLessThan(1);
    expect(DEFAULT_AGENT_LLM_SAMPLING).not.toHaveProperty('repeat_penalty');
    expect(DEFAULT_AGENT_LLM_SAMPLING).not.toHaveProperty('frequency_penalty');
  });
});

describe('agentDifficultyLine', () => {
  test('every tier yields distinct guidance', () => {
    const lines = TIERS.map((t) => baseDifficultyGuidance(t));
    expect(new Set(lines).size).toBe(4);
    for (const tier of TIERS) {
      expect(baseDifficultyGuidance(tier)).toContain('DIFFICULTY TIER');
    }
  });

  test('a game tip is prepended to the generic intent', () => {
    const out = agentDifficultyLine('hard', { hard: 'Captures are mandatory.' });
    expect(out.startsWith('Captures are mandatory.')).toBe(true);
    expect(out).toContain('DIFFICULTY TIER: HARD');
  });

  test('a missing tip falls back to generic intent only', () => {
    expect(agentDifficultyLine('easy', { boss: 'Boss only' })).toBe(baseDifficultyGuidance('easy'));
    expect(agentDifficultyLine('easy')).toBe(baseDifficultyGuidance('easy'));
  });

  test('a blank tip is ignored rather than emitted', () => {
    expect(agentDifficultyLine('medium', { medium: '   ' })).toBe(baseDifficultyGuidance('medium'));
  });
});

describe('buildAgentSystemPrompt', () => {
  test('appends the difficulty section after the base rules', () => {
    const out = buildAgentSystemPrompt({ baseRules: 'RULES', difficulty: 'boss' });
    expect(out.startsWith('RULES')).toBe(true);
    expect(out).toContain('---');
    expect(out).toContain('DIFFICULTY TIER: BOSS');
  });

  test('merges a per-tier mechanics block', () => {
    const out = buildAgentSystemPrompt({
      baseRules: 'RULES',
      difficulty: 'hard',
      gameMechanicsByTier: { hard: 'prefer premiums' },
    });
    expect(out).toContain('GAME MECHANICS (hard):');
    expect(out).toContain('prefer premiums');
  });

  test('applies an all-tiers mechanics block at every tier', () => {
    for (const tier of TIERS) {
      const out = buildAgentSystemPrompt({
        baseRules: 'RULES',
        difficulty: tier,
        gameMechanicsForAllTiers: 'shared appendix',
      });
      expect(out).toContain('shared appendix');
    }
  });

  test('omits the mechanics heading when no mechanics are supplied', () => {
    const out = buildAgentSystemPrompt({ baseRules: 'RULES', difficulty: 'easy' });
    expect(out).not.toContain('GAME MECHANICS');
  });

  test('buildAgentDifficultySection ignores blank mechanics', () => {
    const out = buildAgentDifficultySection('easy', { easy: '  ' }, '  ');
    expect(out).not.toContain('GAME MECHANICS');
  });
});

describe('formatDifficultyUserLine', () => {
  test('includes the tier and the game id when given', () => {
    const out = formatDifficultyUserLine('easy', 'tic-tac-toe.tic-tac-toe');
    expect(out).toContain('easy');
    expect(out).toContain('game: tic-tac-toe.tic-tac-toe');
  });

  test('omits the game suffix when the id is absent', () => {
    expect(formatDifficultyUserLine('easy')).not.toContain('(game:');
  });
});
