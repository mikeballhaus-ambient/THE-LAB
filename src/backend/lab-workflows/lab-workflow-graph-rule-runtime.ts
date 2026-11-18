import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowScope } from '@/shared/types/lab-workflow';
import { resolveWorkflowGraphRuleAsRecord } from '@/shared/utils/lab-workflow-graph-rule-record';
import { workflowGraphTriggerEventType } from '@/shared/utils/lab-workflow-graph-trigger';
import { labRulesRepository } from '../db/LabRules/lab-rules-repository';
import { labRulesService } from '../db/LabRules/lab-rules-service';
import type { LabWorkflowGraphRuleNode } from '@/shared/utils/lab-workflow-graph-rule-record';

export async function workflowGraphRuleNodeMatches(
  node: LabWorkflowGraphRuleNode,
  definition: LabWorkflowDefinitionV2,
  envelope: LabDomainEventEnvelopeV1,
  workflowScope: LabWorkflowScope,
  ownerUserId: number | null,
): Promise<boolean> {
  const triggerEventType = workflowGraphTriggerEventType(definition);
  const rule =
    node.ruleId?.trim()
      ? (labRulesRepository.getById(node.ruleId) ?? null)
      : resolveWorkflowGraphRuleAsRecord(node, triggerEventType, workflowScope, ownerUserId);
  if (!rule) {
    return false;
  }
  const { matches } = await labRulesService.ruleMatchesEvent(rule, envelope);
  return matches;
}
