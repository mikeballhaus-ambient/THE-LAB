/** Parsed `rules_json` on turn-based matches. */
export type MatchRulesJson = {
  turnTimerMs?: number;
  practice?: boolean;
  rulesProfile?: 'free' | 'eight-ball' | 'nine-ball';
  wagerQuarks?: number;
};

export function parseMatchRulesJson(rulesJson: string | null | undefined): MatchRulesJson {
  if (!rulesJson) {
    return {};
  }
  try {
    const parsed = JSON.parse(rulesJson) as MatchRulesJson;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Practice matches simulate Quarks in game rules but skip ledger settlement. */
export function isMatchPracticeMode(rules: MatchRulesJson | null | undefined): boolean {
  return rules?.practice === true;
}
