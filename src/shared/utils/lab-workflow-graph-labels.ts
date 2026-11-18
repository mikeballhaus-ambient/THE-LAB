import type { LabRuleConditionV1, LabRuleRecord } from '@/shared/types/lab-rule';
import type { LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { isLabRuleConditionMeValue } from '@/shared/constants/lab-rule-condition-me';
import { labWorkflowActionStepCanvasLabels } from '@/shared/utils/lab-workflow-definition-canvas';
import { resolveLabDomainEventLabel } from '@/shared/utils/palette-display-text';
import { isPayloadOperatorKind } from '@/shared/utils/lab-rule-condition-operators';
import { labRuleConditionOperatorLabel } from '@/shared/utils/lab-rule-condition-summary';

export type LabWorkflowGraphLabelOptions = {
  catalogEntries?: LabDomainEventCatalogEntry[];
  rules?: LabRuleRecord[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
};

export function labWorkflowGraphNodeLabel(
  node: LabWorkflowGraphNodeV2,
  options?: LabWorkflowGraphLabelOptions,
): string {
  switch (node.kind) {
    case 'trigger': {
      const label = resolveLabDomainEventLabel(node.eventType, options?.catalogEntries ?? []);
      return label ? `When: ${label}` : `When: ${node.eventType}`;
    }
    case 'condition':
      return conditionNodeLabel(node.conditions, options?.integrationServiceCatalog);
    case 'rule': {
      if (node.name?.trim()) {
        return `Rule: ${node.name.trim()}`;
      }
      if (node.ruleId) {
        const rule = options?.rules?.find((r) => r.id === node.ruleId);
        return rule ? `Rule: ${rule.name}` : 'Rule';
      }
      return 'New rule';
    }
    case 'action': {
      if (node.step.kind === 'if_condition') {
        const summaries = labWorkflowGraphNodeConditionLines(node, options);
        if (summaries.length > 0) {
          return summaries.length === 1
            ? summaries[0]
            : `${summaries[0]} (+${summaries.length - 1})`;
        }
        return 'IF';
      }
      const { title, subtitle } = labWorkflowActionStepCanvasLabels(
        node.step,
        options?.rules ?? [],
      );
      return subtitle.trim().length > 0 ? subtitle : title;
    }
    case 'group':
      if (node.label?.trim()) {
        return node.label;
      }
      return node.groupType === 'rules' ? 'Rule group' : 'Action group';
    default:
      return 'Node';
  }
}

/** Small caps row on canvas cards (e.g. lookup vs generic condition, IF vs action). */
export function labWorkflowGraphNodeKindDisplay(
  node: LabWorkflowGraphNodeV2,
  options?: Pick<LabWorkflowGraphLabelOptions, 'rules'>,
): string {
  if (node.kind === 'action') {
    return labWorkflowActionStepCanvasLabels(node.step, options?.rules ?? []).title;
  }
  if (node.kind === 'condition' && node.conditions.length > 0) {
    const first = node.conditions[0];
    if (first.kind === 'lookup_field_exists' || first.kind === 'lookup_field_equals') {
      return 'lookup';
    }
  }
  return node.kind;
}

function resolveIntegrationServiceLabel(
  providerAppId: string,
  serviceId: string,
  catalog: LabIntegrationServiceCatalogResponse | null | undefined,
): string | null {
  const group = catalog?.apps.find((app) => app.appId === providerAppId);
  const service = group?.services.find((row) => row.serviceId === serviceId);
  return service?.label?.trim() || null;
}

function lookupConditionSummary(
  condition: Extract<LabRuleConditionV1, { kind: 'lookup_field_exists' | 'lookup_field_equals' }>,
  catalog: LabIntegrationServiceCatalogResponse | null | undefined,
): string {
  const serviceLabel = resolveIntegrationServiceLabel(
    condition.providerAppId,
    condition.serviceId,
    catalog,
  );
  const fieldPart =
    condition.kind === 'lookup_field_exists'
      ? `${condition.field} exists`
      : `${condition.field} equals`;
  if (serviceLabel) {
    return `${serviceLabel} · ${fieldPart}`;
  }
  return `Connector · ${fieldPart}`;
}

function conditionNodeLabel(
  conditions: LabRuleConditionV1[],
  catalog: LabIntegrationServiceCatalogResponse | null | undefined,
): string {
  if (!conditions.length) {
    return 'Condition';
  }
  if (conditions.length === 1) {
    const condition = conditions[0];
    if (condition.kind === 'lookup_field_exists' || condition.kind === 'lookup_field_equals') {
      return lookupConditionSummary(condition, catalog);
    }
    // Every payload operator, not just exists/equals: a card that says only "Payload · x" for a
    // `greater_than` test hides the number the reader needs to understand the branch.
    if (isPayloadOperatorKind(condition.kind)) {
      return `Payload · ${condition.path} ${labRuleConditionOperatorLabel(condition.kind)}`;
    }
  }
  const firstLookup = conditions.find(
    (c) => c.kind === 'lookup_field_exists' || c.kind === 'lookup_field_equals',
  );
  if (
    firstLookup &&
    (firstLookup.kind === 'lookup_field_exists' || firstLookup.kind === 'lookup_field_equals')
  ) {
    const base = lookupConditionSummary(firstLookup, catalog);
    if (conditions.length > 1) {
      return `${base} (+${conditions.length - 1})`;
    }
    return base;
  }
  return `Conditions (${conditions.length})`;
}

/**
 * Render a payload path for a human, **without mangling the field name**.
 *
 * The previous version split camelCase (`stepValue` → `step Value`), which reads as two words and
 * makes the label look like a typo — on a canvas card the field name is the one thing a reader needs
 * verbatim. Separators (`_`, `-`) still become spaces because those genuinely are word breaks, and the
 * dotted parent is kept so an ambiguous leaf stays unambiguous.
 */
function friendlyPayloadPath(path: string): string {
  return path
    .split('.')
    .map((segment) => segment.replace(/[_-]/g, ' '))
    .join(' › ');
}

function formatConditionValue(value: unknown): string {
  if (value != null && isLabRuleConditionMeValue(value)) {
    return 'me';
  }
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }
  return String(value ?? '');
}

/** One readable line per condition for canvas cards and tooltips. */
export function summarizeConditionForCanvas(
  condition: LabRuleConditionV1,
  catalog?: LabIntegrationServiceCatalogResponse | null,
): string {
  if (condition.kind === 'lookup_field_exists' || condition.kind === 'lookup_field_equals') {
    const base = lookupConditionSummary(condition, catalog);
    if (condition.kind === 'lookup_field_equals') {
      return `${base} ${formatConditionValue(condition.value)}`.trim();
    }
    return base;
  }
  if (condition.kind === 'payload_exists' || condition.kind === 'payload_missing') {
    return `${friendlyPayloadPath(condition.path)} ${labRuleConditionOperatorLabel(condition.kind)}`;
  }
  if (isPayloadOperatorKind(condition.kind)) {
    return `${friendlyPayloadPath(condition.path)} ${labRuleConditionOperatorLabel(condition.kind)} ${formatConditionValue(condition.value)}`;
  }
  return 'Condition';
}

export function conditionsForGraphNode(
  node: LabWorkflowGraphNodeV2,
  options?: LabWorkflowGraphLabelOptions,
): LabRuleConditionV1[] {
  if (node.kind === 'condition') {
    return node.conditions ?? [];
  }
  if (node.kind === 'rule') {
    if (node.conditions?.length) {
      return node.conditions;
    }
    const linked = node.ruleId ? options?.rules?.find((row) => row.id === node.ruleId) : undefined;
    return linked?.definition.conditions ?? [];
  }
  if (node.kind === 'action' && node.step.kind === 'if_condition') {
    return node.step.conditions ?? [];
  }
  return [];
}

export function labWorkflowGraphNodeConditionLines(
  node: LabWorkflowGraphNodeV2,
  options?: LabWorkflowGraphLabelOptions,
): string[] {
  const catalog = options?.integrationServiceCatalog;
  return conditionsForGraphNode(node, options).map((condition) =>
    summarizeConditionForCanvas(condition, catalog),
  );
}

/** Title row when condition detail lines are shown beneath on the canvas card. */
export function labWorkflowGraphNodeCardHeadline(
  node: LabWorkflowGraphNodeV2,
  options?: LabWorkflowGraphLabelOptions,
): string {
  if (node.kind === 'rule') {
    if (node.name?.trim()) {
      return node.name.trim();
    }
    if (node.ruleId) {
      const rule = options?.rules?.find((row) => row.id === node.ruleId);
      return rule?.name?.trim() || 'Rule';
    }
    return 'New rule';
  }
  if (node.kind === 'condition') {
    return 'Condition';
  }
  if (node.kind === 'action' && node.step.kind === 'if_condition') {
    return 'Condition';
  }
  return labWorkflowGraphNodeLabel(node, options);
}

