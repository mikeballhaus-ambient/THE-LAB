import { describe, expect, test } from '@jest/globals';
import { repairStreamedMarkdown } from '@/shared/utils/render-lab-markdown';

/**
 * `renderLabMarkdown` itself cannot run here: the Jest environment is `node` and
 * `sanitizeLabHtml` needs a DOM (no jsdom in this repo). These tests cover the part that
 * decides the audience split — the stream-repair heuristics — and specifically prove *why*
 * authored documentation must not run through them.
 */
describe('repairStreamedMarkdown', () => {
  test('collapses blank lines, which destroys document paragraph structure', () => {
    const authored = 'First paragraph.\n\nSecond paragraph.';
    expect(repairStreamedMarkdown(authored)).toBe('First paragraph.\nSecond paragraph.');
  });

  test('splits a table lead-in off its header row', () => {
    // `:\s*(?=\|)` assumes "Note: |" was meant to be "Note:" then a table.
    expect(repairStreamedMarkdown('Note: | Role | Apps |')).toBe('Note:\n| Role | Apps |');
  });

  test('splits a colon immediately followed by a digit', () => {
    // Only fires with no space after the colon, so `see:1` is broken but `port 3000` is not.
    expect(repairStreamedMarkdown('see:1 for details')).toBe('see:\n1 for details');
  });

  test('leaves a port number alone — the colon is followed by a space', () => {
    const authored = 'App servers listen on port 3000.';
    expect(repairStreamedMarkdown(authored)).toBe(authored);
  });

  test('repairs a model-emitted fence that starts mid-line', () => {
    // Digit-free on purpose: a block containing "1." is turned into a numbered list by the
    // rule tested below, which would remove the fence before this one could move it.
    const streamed = 'Here is code:```ts\nconst a = b;\n```';
    const repaired = repairStreamedMarkdown(streamed);

    // The fence must not begin mid-sentence any more.
    expect(repaired).not.toContain('code:```');
    expect(repaired).toContain('```');
  });

  test('converts a digit-bearing code block into a numbered list, dropping the fence', () => {
    // This is why authored code samples must not go through the repair pass: a fenced block
    // containing "1." becomes a list and the fence disappears entirely.
    const withDigits = '```\n1. first step\n2. second step\n```';
    const repaired = repairStreamedMarkdown(withDigits);
    expect(repaired).not.toContain('```');
    expect(repaired).toContain('first step');
  });

  test('an empty string is returned unchanged', () => {
    expect(repairStreamedMarkdown('')).toBe('');
  });

  test('leaves already-clean single-paragraph text untouched', () => {
    const clean = 'The Knowledge Base is the lab documentation hub.';
    expect(repairStreamedMarkdown(clean)).toBe(clean);
  });
});
