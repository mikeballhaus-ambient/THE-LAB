import type { LabRuleScope } from '@/shared/types/lab-rule';

/** One rule that matched during evaluation (output data only — no side effects). */
export interface LabRuleMatchEvaluationV1 {
  ruleId: string;
  ruleName: string;
  scope: LabRuleScope;
  ownerUserId: number | null;
  priority: number;
  /** Payload paths referenced by conditions and their values at evaluation time. */
  evaluatedFacts: Record<string, unknown>;
}

/** Payload on `platform-rules.evaluation.completed`. */
export interface LabRulesEvaluationCompletedPayloadV1 {
  sourceEventId: string;
  sourceEventType: string;
  sourceAppId: string;
  matchCount: number;
  matches: LabRuleMatchEvaluationV1[];
}

export interface LabRuleDryRunMatchV1 {
  ruleId: string;
  ruleName: string;
  scope: LabRuleScope;
  ownerUserId: number | null;
  priority: number;
  evaluatedFacts: Record<string, unknown>;
}

export interface LabRuleDryRunResultV1 {
  matches: boolean;
  matchCount: number;
  ruleMatches: LabRuleDryRunMatchV1[];
  reason?: string;
}
