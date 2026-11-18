import userService from '../db/Auth/auth-service';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import {
  conditionsMatch,
  conditionsMatchAsync,
  type LabRuleConditionContext,
  type LabRuleConditionIntegrationContext,
} from '../lab-rules/lab-rules-match';
import { LAB_PLATFORM_SYSTEM_USER_ID } from '@/shared/config/lab-platform-system-user';
import { fetchIntegrationRecord } from './lab-workflow-integration-connector-client';

export function ruleConditionsNeedIntegrationLookup(
  conditions: LabRuleConditionV1[] | undefined,
): boolean {
  if (!conditions?.length) {
    return false;
  }
  return conditions.some(
    (c) => c.kind === 'lookup_field_exists' || c.kind === 'lookup_field_equals',
  );
}

export function resolveWorkflowIntegrationActorUser(
  envelope: LabDomainEventEnvelopeV1,
  ownerUserId: number | null,
) {
  const actorId = envelope.actorUserId ?? ownerUserId ?? LAB_PLATFORM_SYSTEM_USER_ID;
  const user = userService.getUserById(actorId);
  if (user) {
    return user;
  }
  return userService.getUserById(LAB_PLATFORM_SYSTEM_USER_ID);
}

export function buildWorkflowIntegrationConditionContext(
  envelope: LabDomainEventEnvelopeV1,
  ownerUserId: number | null,
): LabRuleConditionIntegrationContext | undefined {
  const actor = resolveWorkflowIntegrationActorUser(envelope, ownerUserId);
  if (!actor) {
    return undefined;
  }
  return {
    actorUser: actor,
    fetchRecord: (providerAppId, serviceId, recordId) =>
      fetchIntegrationRecord(actor, providerAppId, serviceId, recordId),
  };
}

export async function workflowConditionsMatch(
  conditions: LabRuleConditionV1[] | undefined,
  payload: Record<string, unknown>,
  context: LabRuleConditionContext,
  envelope: LabDomainEventEnvelopeV1,
): Promise<boolean> {
  if (!ruleConditionsNeedIntegrationLookup(conditions)) {
    return conditionsMatch(conditions, payload, context);
  }
  const integration = buildWorkflowIntegrationConditionContext(envelope, context.ownerUserId);
  return conditionsMatchAsync(conditions, payload, context, integration);
}
