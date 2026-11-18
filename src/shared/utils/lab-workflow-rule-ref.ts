import type { LabRuleRecord } from '@/shared/types/lab-rule';
import { eventTypeMatches } from '@/shared/utils/lab-event-type-match';
import { ruleTriggerMatchesEnvelope } from '@/shared/utils/lab-rule-trigger';

/** Whether a rule library entry can be referenced from a workflow with this trigger event type. */
export function ruleRecordCompatibleWithWorkflowTrigger(
  rule: LabRuleRecord,
  workflowEventType: string,
): boolean {
  return ruleTriggerMatchesEnvelope(rule.definition.trigger, workflowEventType, eventTypeMatches);
}
