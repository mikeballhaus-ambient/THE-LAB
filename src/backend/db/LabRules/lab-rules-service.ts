import { labRulesRepository } from './lab-rules-repository';
import type { LabRuleRecord, LabRuleScope } from '@/shared/types/lab-rule';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabRuleDryRunResultV1 } from '@/shared/types/lab-rule-evaluation';
import {
  parseLabRuleCreate,
  parseLabRuleDefinition,
  parseLabRuleUpdate,
} from '@/shared/types/schemas/lab-rule-schema';
import { conditionsMatch, conditionsMatchAsync, eventTypeMatches } from '../../lab-rules/lab-rules-match';
import {
  buildWorkflowIntegrationConditionContext,
  ruleConditionsNeedIntegrationLookup,
} from '../../lab-workflows/lab-workflow-integration-runtime';
import { ruleTriggerMatchesEnvelope } from '@/shared/utils/lab-rule-trigger';
import { buildEvaluatedFactsForConditions } from '../../lab-rules/lab-rule-evaluation-facts';
import type { User } from '@/shared/types/user';

export interface ListRulesQuery {
  scope?: LabRuleScope;
  ownerUserId?: number;
}

const MAX_ENABLED_GLOBAL = 50;
const MAX_ENABLED_PER_USER = 20;

export function isPlatformRulesAdmin(user: User): boolean {
  return user.role === 'owner' || user.role === 'admin';
}

export class LabRulesService {
  private static instance: LabRulesService | null = null;

  private constructor() {}

  static getInstance(): LabRulesService {
    if (!LabRulesService.instance) {
      LabRulesService.instance = new LabRulesService();
    }
    return LabRulesService.instance;
  }

  listForCaller(caller: User, query?: ListRulesQuery): LabRuleRecord[] {
    if (caller.role === 'viewer') {
      return [];
    }
    const all = labRulesRepository.listAll();
    if (isPlatformRulesAdmin(caller)) {
      return all.filter((rule) => {
        if (query?.scope && rule.scope !== query.scope) {
          return false;
        }
        if (query?.ownerUserId != null && rule.ownerUserId !== query.ownerUserId) {
          return false;
        }
        return true;
      });
    }
    return all.filter(
      (rule) => rule.scope === 'user' && rule.ownerUserId === caller.userId,
    );
  }

  getForCaller(caller: User, ruleId: string): LabRuleRecord | null {
    const rule = labRulesRepository.getById(ruleId);
    if (!rule) {
      return null;
    }
    this.assertCanReadRule(caller, rule);
    return rule;
  }

  createForCaller(caller: User, body: unknown): LabRuleRecord {
    if (caller.role === 'viewer') {
      throw new LabRulesError('FORBIDDEN', 'Viewers cannot manage rules');
    }
    const bodyRecord =
      typeof body === 'object' && body != null ? { ...(body as Record<string, unknown>) } : {};
    if (!isPlatformRulesAdmin(caller)) {
      bodyRecord.scope = 'user';
      bodyRecord.ownerUserId = caller.userId;
    }
    const parsed = parseLabRuleCreate(bodyRecord);
    let scope = parsed.scope;
    let ownerUserId: number | null = parsed.ownerUserId ?? null;

    if (!isPlatformRulesAdmin(caller)) {
      scope = 'user';
      ownerUserId = caller.userId;
    } else if (scope === 'user' && ownerUserId == null) {
      throw new LabRulesError('INVALID_INPUT', 'User-scoped rules require ownerUserId');
    } else if (scope === 'global') {
      ownerUserId = null;
    }

    if (parsed.enabled) {
      this.assertEnableLimits(scope, ownerUserId);
    }

    const definition = parseLabRuleDefinition(parsed.definition);
    const record: LabRuleRecord = {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      scope,
      ownerUserId,
      createdByUserId: caller.userId,
      enabled: parsed.enabled,
      priority: parsed.priority,
      definition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    labRulesRepository.insertRule({
      id: record.id,
      name: record.name,
      description: record.description ?? null,
      scope: record.scope,
      ownerUserId: record.ownerUserId,
      createdByUserId: record.createdByUserId,
      enabled: record.enabled,
      priority: record.priority,
      definitionJson: JSON.stringify(record.definition),
    });

    return record;
  }

  updateForCaller(caller: User, ruleId: string, body: unknown): LabRuleRecord {
    if (caller.role === 'viewer') {
      throw new LabRulesError('FORBIDDEN', 'Viewers cannot manage rules');
    }
    const existing = labRulesRepository.getById(ruleId);
    if (!existing) {
      throw new LabRulesError('NOT_FOUND', 'Rule not found');
    }
    this.assertCanWriteRule(caller, existing);

    const parsed = parseLabRuleUpdate(body);
    const adminPatch = body as { scope?: LabRuleScope; ownerUserId?: number };

    const next: LabRuleRecord = {
      ...existing,
      name: parsed.name ?? existing.name,
      description: parsed.description ?? existing.description,
      enabled: parsed.enabled ?? existing.enabled,
      priority: parsed.priority ?? existing.priority,
      definition: parsed.definition
        ? parseLabRuleDefinition(parsed.definition)
        : existing.definition,
      updatedAt: new Date().toISOString(),
    };

    if (isPlatformRulesAdmin(caller)) {
      if (adminPatch.scope !== undefined) {
        next.scope = adminPatch.scope;
      }
      if (adminPatch.ownerUserId !== undefined) {
        next.ownerUserId = adminPatch.ownerUserId;
      }
      if (next.scope === 'global') {
        next.ownerUserId = null;
      }
    }

    if (next.enabled && !existing.enabled) {
      this.assertEnableLimits(next.scope, next.ownerUserId);
    }

    labRulesRepository.updateRule(next);
    return next;
  }

  deleteForCaller(caller: User, ruleId: string): void {
    if (caller.role === 'viewer') {
      throw new LabRulesError('FORBIDDEN', 'Viewers cannot manage rules');
    }
    const existing = labRulesRepository.getById(ruleId);
    if (!existing) {
      throw new LabRulesError('NOT_FOUND', 'Rule not found');
    }
    this.assertCanWriteRule(caller, existing);
    labRulesRepository.deleteRule(ruleId);
  }

  async dryRunForCaller(
    caller: User,
    envelope: LabDomainEventEnvelopeV1,
    ruleId?: string,
  ): Promise<LabRuleDryRunResultV1> {
    if (caller.role === 'viewer') {
      throw new LabRulesError('FORBIDDEN', 'Viewers cannot dry-run rules');
    }
    const rules = ruleId
      ? [labRulesRepository.getById(ruleId)].filter((r): r is LabRuleRecord => r != null)
      : this.listForCaller(caller).filter((r) => r.enabled);

    const ruleMatches: LabRuleDryRunResultV1['ruleMatches'] = [];
    for (const rule of rules) {
      if (ruleId) {
        this.assertCanReadRule(caller, rule);
      }
      const match = await this.ruleMatchesEvent(rule, envelope);
      if (match.matches) {
        ruleMatches.push({
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
      } else if (ruleId) {
        return { matches: false, matchCount: 0, ruleMatches: [], reason: match.reason };
      }
    }
    return {
      matches: ruleMatches.length > 0,
      matchCount: ruleMatches.length,
      ruleMatches,
    };
  }

  async ruleMatchesEvent(
    rule: LabRuleRecord,
    envelope: LabDomainEventEnvelopeV1,
  ): Promise<{ matches: boolean; reason?: string }> {
    if (!rule.enabled) {
      return { matches: false, reason: 'Rule disabled' };
    }
    if (!ruleTriggerMatchesEnvelope(rule.definition.trigger, envelope.type, eventTypeMatches)) {
      return { matches: false, reason: 'Event type mismatch' };
    }
    const conditionContext = {
      scope: rule.scope,
      ownerUserId: rule.ownerUserId,
    };
    const needsLookup = ruleConditionsNeedIntegrationLookup(rule.definition.conditions);
    const conditionsOk = needsLookup
      ? await conditionsMatchAsync(
          rule.definition.conditions,
          envelope.payload,
          conditionContext,
          buildWorkflowIntegrationConditionContext(envelope, rule.ownerUserId),
        )
      : conditionsMatch(rule.definition.conditions, envelope.payload, conditionContext);
    if (!conditionsOk) {
      return { matches: false, reason: 'Conditions not met' };
    }
    if (rule.scope === 'user') {
      const actor = envelope.actorUserId ?? null;
      if (actor == null || rule.ownerUserId !== actor) {
        return { matches: false, reason: 'Actor does not own user rule' };
      }
    }
    return { matches: true };
  }

  listEnabledForEvaluation(actorUserId: number | null | undefined): LabRuleRecord[] {
    const actor = actorUserId != null && actorUserId > 0 ? actorUserId : null;
    return labRulesRepository.listEnabledRulesForEvaluation(actor);
  }

  private assertCanReadRule(caller: User, rule: LabRuleRecord): void {
    if (isPlatformRulesAdmin(caller)) {
      return;
    }
    if (rule.scope === 'user' && rule.ownerUserId === caller.userId) {
      return;
    }
    throw new LabRulesError('FORBIDDEN', 'Cannot read this rule');
  }

  private assertCanWriteRule(caller: User, rule: LabRuleRecord): void {
    if (isPlatformRulesAdmin(caller)) {
      return;
    }
    if (rule.scope === 'user' && rule.ownerUserId === caller.userId) {
      return;
    }
    throw new LabRulesError('FORBIDDEN', 'Cannot modify this rule');
  }

  private assertEnableLimits(scope: LabRuleScope, ownerUserId: number | null): void {
    if (scope === 'global') {
      if (labRulesRepository.countEnabledGlobal() >= MAX_ENABLED_GLOBAL) {
        throw new LabRulesError('LIMIT', 'Maximum enabled global rules reached');
      }
      return;
    }
    if (ownerUserId == null) {
      throw new LabRulesError('INVALID_INPUT', 'User rule requires owner');
    }
    if (labRulesRepository.countEnabledForOwner(ownerUserId) >= MAX_ENABLED_PER_USER) {
      throw new LabRulesError('LIMIT', 'Maximum enabled user rules reached for owner');
    }
  }
}

export class LabRulesError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_INPUT' | 'LIMIT',
    message: string,
  ) {
    super(message);
    this.name = 'LabRulesError';
  }
}

export const labRulesService = LabRulesService.getInstance();
