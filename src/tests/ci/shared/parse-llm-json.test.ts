import { describe, expect, test } from '@jest/globals';
import {
  extractBalancedJsonObject,
  parseMoveJsonFromModelText,
} from '@/shared/utils/parse-llm-json';

describe('extractBalancedJsonObject', () => {
  test('returns null for truncated object', () => {
    const partial = '{"type":"place","placements":[{"row":7,"col":-';
    expect(extractBalancedJsonObject(partial, 0)).toBeNull();
  });

  test('extracts nested placements', () => {
    const full =
      '{"type":"place","placements":[{"row":7,"col":7,"letter":"Q"}]} extra';
    expect(extractBalancedJsonObject(full, 0)).toBe(
      '{"type":"place","placements":[{"row":7,"col":7,"letter":"Q"}]}',
    );
  });
});

describe('parseMoveJsonFromModelText', () => {
  test('rejects truncated move json with clear error', () => {
    const partial = `Analysis…\n{"type":"place","placements":[{"row":7,"col":-`;
    expect(() => parseMoveJsonFromModelText(partial)).toThrow(/Incomplete move JSON/);
  });

  test('rejects prose-only responses without calling JSON.parse on babble', () => {
    expect(() => parseMoveJsonFromModelText('QWEARLE is not a valid opening word for this rack.')).toThrow(
      /No move JSON found/,
    );
  });

  test('extracts move JSON after long prose when fenced block is valid', () => {
    const text = `QWEARLE is tempting but illegal.
\`\`\`json
{"type":"pass"}
\`\`\``;
    const parsed = parseMoveJsonFromModelText<{ type: string }>(text);
    expect(parsed.type).toBe('pass');
  });

  test('skips Thinking Process preamble before JSON fence', () => {
    const text = `Thinking Process:
1. Analyze the board.
\`\`\`json
{"type":"place","placements":[{"row":7,"col":7,"letter":"A"}]}
\`\`\``;
    const parsed = parseMoveJsonFromModelText<{ type: string }>(text);
    expect(parsed.type).toBe('place');
  });
});
