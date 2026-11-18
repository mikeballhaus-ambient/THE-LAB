import { describe, test, expect } from '@jest/globals';
import { WORD_TILE_GAME_IDS } from '@/apps/word-tile/shared/types';
import {
  agentDifficultyBlock,
  buildAgentSystemPromptForTier as buildWordTileAgentSystemPrompt,
} from '@/apps/word-tile/back-end/rules';
import {
  AGENT_DIFFICULTY_TEMPERATURE,
  agentDifficultyLine,
  agentTemperature,
  buildAgentDifficultySection,
  buildAgentSystemPrompt,
  formatDifficultyUserLine,
} from '@/shared/game-platform/difficulty-policy';

const TIERS = ['easy', 'medium', 'hard', 'boss'] as const;

/**
 * Word Tile's difficulty surface.
 *
 * Generic tier intent and the temperature table live in the kit; this suite pins
 * the Word Tile half (persona + tile mechanics) and the assembly that combines
 * them. Kit-level behaviour is covered by `game-difficulty-policy.test.ts`.
 */
describe('word-tile difficulty policy', () => {
  test('both halves come from the kit — tier guidance and temperature', () => {
    for (const tier of TIERS) {
      expect(buildAgentDifficultySection(tier)).toContain(
        `DIFFICULTY TIER: ${tier.toUpperCase()}`,
      );
      expect(agentTemperature(tier)).toBe(AGENT_DIFFICULTY_TEMPERATURE[tier]);
    }
  });

  test('every tier has a distinct Scrabble-style persona', () => {
    const lines = TIERS.map((t) => buildWordTileAgentSystemPrompt(t));
    expect(new Set(lines).size).toBe(4);
    for (const line of lines) {
      expect(line).toContain('Scrabble-style opponent');
      expect(line).toContain('15x15 board');
    }
  });

  test('the persona reflects its tier', () => {
    expect(buildWordTileAgentSystemPrompt('easy')).toContain('casual Scrabble-style');
    expect(buildWordTileAgentSystemPrompt('boss')).toContain('highly skilled Scrabble-style');
  });

  test('the assembled prompt carries the tier block and tile mechanics', () => {
    const out = buildWordTileAgentSystemPrompt('boss');
    expect(out).toContain('DIFFICULTY TIER: BOSS');
    // Tile mechanics are merged in, not passed through the caller.
    expect(out).toContain('GAME MECHANICS (boss):');
    expect(out).toContain('full-rack plays');
  });

  test('the assembled prompt carries the tool contract', () => {
    const out = buildWordTileAgentSystemPrompt('medium');
    expect(out).toContain('tile_word_grid_submit_move');
    expect(out).toContain('OUTPUT CONTRACT');
  });

  test('agentDifficultyBlock returns generic tier intent for Word Tile', () => {
    for (const tier of TIERS) {
      expect(agentDifficultyBlock(tier)).toBe(agentDifficultyLine(tier));
      expect(agentDifficultyBlock(tier)).toContain(`DIFFICULTY TIER: ${tier.toUpperCase()}`);
    }
  });

  test('a caller-supplied mechanics block overrides nothing implicitly', () => {
    const out = buildAgentSystemPrompt({
      baseRules: 'RULES',
      difficulty: 'hard',
      gameMechanicsForAllTiers: 'Always legal.',
    });
    expect(out).toContain('RULES');
    expect(out).toContain('DIFFICULTY TIER: HARD');
    expect(out).toContain('GAME MECHANICS:\nAlways legal.');
  });

  test('formatDifficultyUserLine includes the game id when provided', () => {
    expect(formatDifficultyUserLine('easy', WORD_TILE_GAME_IDS.TILE_WORD_GRID)).toContain(
      'tile-word-grid',
    );
    expect(formatDifficultyUserLine('easy')).not.toContain('(game:');
  });

  test('easy temperature is higher than boss', () => {
    expect(agentTemperature('easy')).toBeGreaterThan(agentTemperature('boss'));
  });
});
