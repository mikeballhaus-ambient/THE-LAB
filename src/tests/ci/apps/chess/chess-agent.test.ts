import { describe, expect, test } from '@jest/globals';
import { createInitialPieces } from '@/apps/chess/back-end/rules';
import { buildUserPrompt, buildSystemPrompt, legalMoveList } from '@/apps/chess/back-end/agent';

describe('chess agent prompts', () => {
  test('legalMoveList includes row/col coordinates for the structural tool', () => {
    const pieces = createInitialPieces();
    const blackOpens = legalMoveList(pieces, 'black');
    expect(blackOpens.length).toBeGreaterThan(0);
    const e7e5 = blackOpens.find((line) => line.startsWith('e7-e5'));
    expect(e7e5).toBeDefined();
    expect(e7e5).toContain('fromRow:1,fromCol:4,toRow:3,toCol:4');
  });

  test('buildUserPrompt warns not to use rank as row index', () => {
    const pieces = createInitialPieces();
    const prompt = buildUserPrompt({ pieces, turnHistory: [] }, 2, 'medium');
    expect(prompt).toContain('Do NOT use chess rank numbers as row indices');
    expect(prompt).toContain('fromRow:');
  });

  test('buildSystemPrompt boss tier includes one-ply reply guidance', () => {
    const prompt = buildSystemPrompt('boss');
    expect(prompt).toContain('ONE-PLY OPPONENT REPLY');
    expect(prompt).toContain('CHESS PLAY (boss)');
    expect(prompt).toContain('checkmate');
  });

  test('buildUserPrompt boss tier includes turn checklist', () => {
    const pieces = createInitialPieces();
    const prompt = buildUserPrompt({ pieces, turnHistory: [] }, 2, 'boss');
    expect(prompt).toContain('Turn checklist');
  });
});
