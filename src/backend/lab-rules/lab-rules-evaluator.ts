import { randomUUID } from 'node:crypto';
import type { Server as SocketIOServer } from 'socket.io';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabRuleMatchEvaluationV1 } from '@/shared/types/lab-rule-evaluation';
import {
  LAB_RULES_EVALUATION_COMPLETED_TYPE,
  LAB_RULES_PLATFORM_SOURCE_APP_ID,
} from '@/shared/types/lab-rules-platform';
import { labRulesService } from '../db/LabRules/lab-rules-service';
import { publishLabDomainEventPipeline } from '../lab-events/publish-lab-domain-event-pipeline';
import { buildEvaluatedFactsForConditions } from './lab-rule-evaluation-facts';

export interface EvaluateRulesOptions {
  io?: SocketIOServer;
  /** @deprecated Rules no longer execute actions; kept for call-site compatibility. */
  fromRuleEngine?: boolean;
}

function isRulesPlatformEvent(envelope: LabDomainEventEnvelopeV1): boolean {
  return envelope.sourceAppId === LAB_RULES_PLATFORM_SOURCE_APP_ID;
}

async function collectMatches(envelope: LabDomainEventEnvelopeV1): Promise<LabRuleMatchEvaluationV1[]> {
  const rules = labRulesService.listEnabledForEvaluation(envelope.actorUserId);
  const matches: LabRuleMatchEvaluationV1[] = [];

  for (const rule of rules) {
    const { matches: ok } = await labRulesService.ruleMatchesEvent(rule, envelope);
    if (!ok) {
      continue;
    }
    matches.push({
      ruleId: rule.id,
      ruleName: rule.name,
      scope: rule.scope,
      ownerUserId: rule.ownerUserId,
      priority: rule.priority,
      evaluatedFacts: buildEvaluatedFactsForConditions(
        rule.definition.conditions,
        envelope.payload,
      ),
    });
  }

  return matches;
}

export async function evaluateRulesForDomainEvent(
  envelope: LabDomainEventEnvelopeV1,
  options: EvaluateRulesOptions,
): Promise<void> {
  if (options.fromRuleEngine === true || isRulesPlatformEvent(envelope)) {
    return;
  }

  const matches = await collectMatches(envelope);
  if (matches.length === 0) {
    return;
  }

  const evaluationEnvelope: LabDomainEventEnvelopeV1 = {
    schemaVersion: 1,
    id: randomUUID(),
    type: LAB_RULES_EVALUATION_COMPLETED_TYPE,
    sourceAppId: LAB_RULES_PLATFORM_SOURCE_APP_ID,
    occurredAt: new Date().toISOString(),
    actorUserId: envelope.actorUserId,
    payload: {
      sourceEventId: envelope.id,
      sourceEventType: envelope.type,
      sourceAppId: envelope.sourceAppId,
      matchCount: matches.length,
      matches,
    },
  };

  await publishLabDomainEventPipeline(evaluationEnvelope, envelope.actorUserId, options.io, {
    runRulesEvaluation: false,
  });
}
