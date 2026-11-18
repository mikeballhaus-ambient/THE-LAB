/**
 * When false (default), rules are not evaluated on every bus publish.
 * Rules run via workflow `rule_ref` steps and dry-run APIs instead.
 * Set `LAB_BUS_RULES_EVALUATION=1` to restore legacy bus-wide rule evaluation.
 */
export function isLabBusRulesEvaluationEnabled(): boolean {
  const raw = process.env.LAB_BUS_RULES_EVALUATION?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}
