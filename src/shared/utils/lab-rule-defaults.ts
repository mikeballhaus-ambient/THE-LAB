import type { LabRuleDefinitionV1 } from '@/shared/types/lab-rule';
import { LAB_RULE_DEFINITION_SCHEMA_VERSION } from '@/shared/types/lab-rule';
import { buildLabEventType } from '@/shared/types/lab-domain-event';

export function createDefaultLabRuleDefinition(
  eventTypes: string[] = [buildLabEventType('app-lab-tasklist', 'task', 'created')],
): LabRuleDefinitionV1 {
  return {
    schemaVersion: LAB_RULE_DEFINITION_SCHEMA_VERSION,
    trigger: { eventTypes: [...eventTypes] },
  };
}
