import { isMatchPracticeMode, parseMatchRulesJson } from '@/shared/game-platform/match-rules';

describe('match practice Quarks rules', () => {
  test('parseMatchRulesJson reads practice flag', () => {
    expect(parseMatchRulesJson(JSON.stringify({ practice: true, turnTimerMs: 60_000 }))).toEqual({
      practice: true,
      turnTimerMs: 60_000,
    });
    expect(parseMatchRulesJson(null)).toEqual({});
  });

  test('isMatchPracticeMode is true only when practice is set', () => {
    expect(isMatchPracticeMode({ practice: true })).toBe(true);
    expect(isMatchPracticeMode({})).toBe(false);
    expect(isMatchPracticeMode({ practice: false })).toBe(false);
  });
});
