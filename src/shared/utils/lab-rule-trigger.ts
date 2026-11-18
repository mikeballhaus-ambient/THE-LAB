import type { LabRuleDefinitionV1 } from '@/shared/types/lab-rule';

export interface LabRuleTriggerV1 {
  eventTypes: string[];
}

/** Legacy rows may still store `trigger.eventType` (string). */
export function getRuleTriggerEventTypes(
  trigger: { eventTypes?: string[]; eventType?: string },
): string[] {
  if (trigger.eventTypes?.length) {
    return [...new Set(trigger.eventTypes)];
  }
  if (trigger.eventType?.trim()) {
    return [trigger.eventType.trim()];
  }
  return [];
}

export function ruleTriggerMatchesEnvelope(
  trigger: { eventTypes?: string[]; eventType?: string },
  envelopeType: string,
  eventTypeMatches: (pattern: string, actual: string) => boolean,
): boolean {
  const types = getRuleTriggerEventTypes(trigger);
  if (types.length === 0) {
    return false;
  }
  return types.some((pattern) => eventTypeMatches(pattern, envelopeType));
}

export function withNormalizedTrigger(definition: LabRuleDefinitionV1): LabRuleDefinitionV1 {
  const eventTypes = getRuleTriggerEventTypes(definition.trigger);
  return {
    ...definition,
    trigger: { eventTypes },
  };
}
