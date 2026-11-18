import {
  LAB_RULE_DEFINITION_SCHEMA_VERSION,
  type LabRuleConditionV1,
  type LabRuleRecord,
} from '@/shared/types/lab-rule';
import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowScope } from '@/shared/types/lab-workflow';

export type LabWorkflowGraphRuleNode = Extract<LabWorkflowGraphNodeV2, { kind: 'rule' }>;

/** True when the node has a library link or an inline name + conditions. */
export function labWorkflowRuleNodeIsConfigured(node: LabWorkflowGraphRuleNode): boolean {
  if (node.ruleId?.trim()) {
    return true;
  }
  return Boolean(node.name?.trim() && node.conditions && node.conditions.length > 0);
}

/**
 * Build a synthetic {@link LabRuleRecord} for evaluating an inline workflow rule node.
 * Returns null when the node uses a library `ruleId` or is not configured.
 */
export function resolveWorkflowGraphRuleAsRecord(
  node: LabWorkflowGraphRuleNode,
  triggerEventType: string,
  workflowScope: LabWorkflowScope,
  ownerUserId: number | null,
): LabRuleRecord | null {
  if (node.ruleId?.trim()) {
    return null;
  }
  const name = node.name?.trim();
  const conditions = node.conditions;
  if (!name || !conditions?.length || !triggerEventType.trim()) {
    return null;
  }
  const scope = workflowScope;
  return {
    id: node.id,
    name,
    scope,
    ownerUserId: scope === 'user' ? ownerUserId : null,
    createdByUserId: ownerUserId ?? 0,
    enabled: true,
    priority: 100,
    createdAt: '',
    updatedAt: '',
    definition: {
      schemaVersion: LAB_RULE_DEFINITION_SCHEMA_VERSION,
      trigger: { eventTypes: [triggerEventType] },
      conditions: conditions as LabRuleConditionV1[],
    },
  };
}
