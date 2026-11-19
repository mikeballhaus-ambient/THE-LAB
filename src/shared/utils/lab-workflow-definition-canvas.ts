import type { LabRuleRecord } from '@/shared/types/lab-rule';
import type { LabWorkflowDefinitionV1, LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import { LAB_WORKFLOW_DEFINITION_SCHEMA_VERSION } from '@/shared/types/lab-workflow';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { WorkflowCanvasEventBlock } from '@/shared/types/lab-workflow-canvas';
import { buildCodeNodeExample } from '@/shared/utils/lab-workflow-code-example';
import { migrateLabWorkflowStep } from '@/shared/utils/lab-workflow-step-migrations';

export interface WorkflowCanvasFlowBlock {
  dragId: string;
  step: LabWorkflowStepV1;
  displayLabel: string;
  displayHint: string;
  /** Dropped from palette; rule not saved until quick-create dialog completes. */
  pendingQuickRule?: boolean;
  pendingInsertIndex?: number;
}

export const WORKFLOW_NEW_RULE_PALETTE_BLOCK = {
  dragId: 'wf-palette-new-rule',
  kind: 'new_rule_placeholder' as const,
  label: 'New rule',
  description: 'Create a library rule and wire it into this workflow.',
  isPalette: true as const,
};

export function flowBlockPendingNewRule(insertIndex: number): WorkflowCanvasFlowBlock {
  return {
    dragId: `wf-flow-pending-${crypto.randomUUID()}`,
    step: { kind: 'rule_ref', ruleId: '' },
    displayLabel: 'New rule',
    displayHint: 'Finish setup to save to Rules Engine',
    pendingQuickRule: true,
    pendingInsertIndex: insertIndex,
  };
}

export function flowBlocksForDefinition(flow: WorkflowCanvasFlowBlock[]): WorkflowCanvasFlowBlock[] {
  return flow.filter((block) => !block.pendingQuickRule);
}

/**
 * A one-line summary of what a `code` step writes, for the canvas card.
 *
 * Heuristic on purpose: this runs on every render, so parsing is not an option, and a wrong-but-short
 * hint is worse than an honest generic one. It recognises the shape the editor generates —
 * `{ ...item, field: … }` — and names those fields; anything else falls back to a neutral phrase.
 *
 * The previous version showed the first line of the source, which for a block body was `(items) => {`:
 * technically accurate and completely uninformative on a card.
 */
export function describeCodeStep(source: string | undefined): string {
  if (!source?.trim()) {
    return 'No code yet';
  }
  // Comments carry no behaviour, and would otherwise contribute field names they merely mention.
  const body = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  // Every object literal that spreads an item is a shaping site; collect the keys alongside the
  // spread. A single `...item` can introduce several fields, so this scans each literal body rather
  // than stopping at the first key.
  const fields = new Set<string>();
  for (const literal of body.matchAll(/\{[^{}]*\.\.\.[^{}]*\}/g)) {
    for (const key of literal[0].matchAll(/(?:^|[,{]\s*)([a-zA-Z_$][\w$]*)\s*:/g)) {
      fields.add(key[1]);
    }
  }
  if (fields.size > 0) {
    const list = [...fields];
    return list.length <= 2
      ? `Writes ${list.join(', ')}`
      : `Writes ${list.slice(0, 2).join(', ')} +${list.length - 2} more`;
  }
  // Any item-array verb means the body still transforms rather than merely inspecting.
  return /\.(map|filter|flatMap|reduce|sort)\s*\(/.test(body)
    ? 'Transforms the items'
    : 'Runs code over the items';
}

export function catalogMetaForEventType(
  eventType: string,
  catalogEntries: LabDomainEventCatalogEntry[],
): { label: string; description: string } {
  const entry = catalogEntries.find((e) => e.eventType === eventType);
  if (entry) {
    return { label: entry.label, description: entry.description };
  }
  const parts = eventType.split('.');
  const tail = parts[parts.length - 1] ?? eventType;
  return {
    label: tail.replace(/[-_]/g, ' '),
    description: 'Custom or observed event type.',
  };
}

export function triggerBlockFromEventType(
  eventType: string,
  catalogEntries: LabDomainEventCatalogEntry[],
): WorkflowCanvasEventBlock {
  const meta = catalogMetaForEventType(eventType, catalogEntries);
  return {
    dragId: `wf-trigger-${eventType}`,
    eventType,
    label: meta.label,
    description: meta.description,
    isPalette: false,
  };
}

function ruleLabel(ruleId: string, rules: LabRuleRecord[]): string {
  const rule = rules.find((r) => r.id === ruleId);
  return rule ? `${rule.name} (${rule.scope})` : 'Library rule';
}

function payloadFieldHint(path: string, emptyLabel: string): string {
  if (!path?.trim()) {
    return emptyLabel;
  }
  const leaf = path.split('.').pop() ?? path;
  const readable = leaf.replace(/[-_]/g, ' ');
  return `Uses “${readable}” from the event payload`;
}

/** Canvas card title + subtitle for a graph action step (matches palette / linear editor copy). */
export function labWorkflowActionStepCanvasLabels(
  step: LabWorkflowStepV1,
  rules: LabRuleRecord[] = [],
): { title: string; subtitle: string } {
  const block = stepToFlowBlock(step, rules);
  return { title: block.displayLabel, subtitle: block.displayHint };
}

function stepToFlowBlock(stepInput: LabWorkflowStepV1, rules: LabRuleRecord[]): WorkflowCanvasFlowBlock {
  const step = migrateLabWorkflowStep(stepInput);
  const dragId = `wf-flow-${crypto.randomUUID()}`;
  switch (step.kind) {
    case 'rule_ref':
      return {
        dragId,
        step,
        displayLabel: 'Evaluate rule',
        displayHint: ruleLabel(step.ruleId, rules),
      };
    case 'notify_users':
      /*
       * A path recipient is named in the hint rather than summarised as a count: "1 lab user
       * selected" is true for both `userIds: [3]` and `path: 'user.email'`, and those two nodes
       * behave completely differently when the payload changes. The hint is the only place the
       * canvas says which one this is.
       */
      return {
        dragId,
        step,
        displayLabel: 'Notify lab users',
        displayHint: step.path?.trim()
          ? payloadFieldHint(step.path, 'Choose a payload field for the recipient')
          : step.userIds.length
            ? `${step.userIds.length} lab user${step.userIds.length === 1 ? '' : 's'} selected`
            : 'Pick user(s) or a payload field',
      };
    case 'comms_system_dm_payload_user':
      return {
        dragId,
        step,
        displayLabel: 'Messages DM (THE-LAB)',
        displayHint: payloadFieldHint(step.path, 'Choose a payload field for the recipient'),
      };
    case 'publish_event':
      return {
        dragId,
        step,
        displayLabel: 'Publish event',
        displayHint: 'Emits a follow-up domain event',
      };
    // Data nodes (A2–A6). Each case must exist explicitly: the `default` below substitutes a
    // `notify_users` step, which would silently turn a data node into a notification the moment the
    // block was re-rendered through this function.
    case 'set_fields':
      return {
        dragId,
        step,
        displayLabel: 'Set fields',
        displayHint: step.fields.length
          ? `Writes ${step.fields.map((field) => field.path).join(', ')}`
          : 'Add a field to write',
      };
    case 'code':
      return {
        dragId,
        step,
        displayLabel: 'Code',
        // Describe the effect, not the syntax. The first line of a block body is `(items) => {`, which
        // tells a reader nothing; the fields the body writes are what the card should say.
        displayHint: describeCodeStep(step.source),
      };
    case 'rename_fields':
      return {
        dragId,
        step,
        displayLabel: 'Rename / remove fields',
        displayHint: `${step.renames?.length ?? 0} renamed · ${step.remove?.length ?? 0} removed`,
      };
    case 'date_time':
      return {
        dragId,
        step,
        displayLabel: 'Date & time',
        displayHint: step.operations.length
          ? step.operations
              .map((operation) =>
                operation.op === 'format'
                  ? `format ${operation.source}`
                  : `${operation.op} ${operation.amount ?? 0} ${operation.unit ?? 'days'} on ${operation.source}`,
              )
              .join('; ')
          : 'Add a date operation',
      };
    case 'filter_items':
      return {
        dragId,
        step,
        displayLabel: 'Filter items',
        displayHint: `${step.conditions.length} condition${step.conditions.length === 1 ? '' : 's'} · ${step.combine ?? 'all'}`,
      };
    case 'sort_items':
      return {
        dragId,
        step,
        displayLabel: 'Sort / limit / dedupe',
        displayHint: [
          step.sort?.length ? `sort ${step.sort.map((key) => key.path).join(', ')}` : '',
          step.limit != null ? `limit ${step.limit}` : '',
          step.dedupeBy ? `dedupe ${step.dedupeBy}` : '',
        ]
          .filter(Boolean)
          .join(' · ') || 'No list operation configured',
      };
    // Routing nodes (W7).
    case 'if_condition':
      return {
        dragId,
        step,
        displayLabel: 'IF',
        displayHint: `${step.conditions.length} condition${step.conditions.length === 1 ? '' : 's'} · true / false`,
      };
    case 'switch_condition':
      return {
        dragId,
        step,
        displayLabel: 'Switch',
        displayHint: `${step.routings.length} branch${step.routings.length === 1 ? '' : 'es'} + fallback`,
      };
    case 'split_out':
      return {
        dragId,
        step,
        displayLabel: 'Split out',
        displayHint: `Expands “${step.path}” into one item per element`,
      };
    case 'merge_items':
      return {
        dragId,
        step,
        displayLabel: 'Merge',
        displayHint: step.mode === 'by_key'
          ? `Joins branches on “${step.keyPath ?? 'no key yet'}”`
          : step.mode === 'by_index'
            ? 'Pairs row N of every branch'
            : 'Appends the branches in connection order',
      };
    case 'loop':
      return {
        dragId,
        step,
        displayLabel: 'Loop',
        displayHint: step.while?.length
          ? `While ${step.while.length} condition${step.while.length === 1 ? '' : 's'} · max ${step.maxIterations}`
          : `Up to ${step.maxIterations} iteration${step.maxIterations === 1 ? '' : 's'}`,
      };
    case 'wait':
      return {
        dragId,
        step,
        displayLabel: 'Wait',
        displayHint: `Pauses for ${step.amount} ${step.unit} before continuing`,
      };
    // Platform nodes (W9).
    case 'lab_query_app':
      return {
        dragId,
        step,
        displayLabel: 'Query lab app',
        displayHint: `${step.providerAppId} · ${step.serviceId}${step.recordIdPath ? ` by ${step.recordIdPath}` : ''}`,
      };
    case 'integration_create': {
      const serviceTail = step.serviceId.includes('.')
        ? step.serviceId.split('.').pop() ?? step.serviceId
        : step.serviceId;
      const recordLabel = serviceTail.replace(/-/g, ' ');
      const mappedCount = Object.keys(step.bodyFromPayload ?? {}).length;
      return {
        dragId,
        step,
        displayLabel: 'Create lab record',
        displayHint: mappedCount
          ? `Creates ${recordLabel} using ${mappedCount} field${mappedCount === 1 ? '' : 's'} from the event`
          : `Creates a ${recordLabel} record in a connected app`,
      };
    }
    case 'integration_update': {
      const serviceTail = step.serviceId.includes('.')
        ? step.serviceId.split('.').pop() ?? step.serviceId
        : step.serviceId;
      return {
        dragId,
        step,
        displayLabel: 'Update lab record',
        displayHint: `Updates ${serviceTail.replace(/-/g, ' ')} · id from ${step.recordIdPath}`,
      };
    }
    case 'integration_delete':
      return {
        dragId,
        step,
        displayLabel: 'Delete lab record',
        displayHint: `${step.providerAppId} · ${step.serviceId} · id from ${step.recordIdPath}`,
      };
    case 'raise_approval':
      return {
        dragId,
        step,
        displayLabel: 'Raise approval',
        displayHint: step.title,
      };
    case 'ledger_post_entry': {
      const memoHint = step.memoPath
        ? `memo from ${step.memoPath} (fallback: ${step.memo})`
        : step.memo;
      return {
        dragId,
        step,
        displayLabel: 'Post to ledger',
        displayHint: `${memoHint} · ${step.lines.length} line${step.lines.length === 1 ? '' : 's'} · confirmed by user ${step.confirmedByUserId}`,
      };
    }
    case 'virtual_bank_get_wallet':
      return {
        dragId,
        step,
        displayLabel: 'Get Quarks wallet',
        displayHint: payloadFieldHint(step.userIdPath ?? 'userId', 'Uses user id from the item'),
      };
    case 'virtual_bank_credit_daily_allotment':
      return {
        dragId,
        step,
        displayLabel: 'Credit daily Quarks',
        displayHint: payloadFieldHint(step.userIdPath ?? 'userId', 'Uses user id from the item'),
      };
    case 'show_user_toast':
      return {
        dragId,
        step,
        displayLabel: 'Show lab toast',
        displayHint: `${step.severity}: ${step.summary}`,
      };
    case 'http_request': {
      const mappedCount = Object.keys(step.bodyFromPayload ?? {}).length;
      const bodyHint = mappedCount
        ? ` · ${mappedCount} body field${mappedCount === 1 ? '' : 's'} from event`
        : '';
      return {
        dragId,
        step,
        displayLabel: 'HTTP request',
        displayHint: `${step.method} ${step.url}${bodyHint}${step.allowList?.length ? ` · ${step.allowList.length} allowed host(s)` : ''}`,
      };
    }
    default:
      return {
        dragId,
        step,
        displayLabel: 'Step',
        displayHint: '',
      };
  }
}

export function definitionToCanvasFlow(
  definition: LabWorkflowDefinitionV1,
  rules: LabRuleRecord[],
): WorkflowCanvasFlowBlock[] {
  return definition.steps.map((step) => stepToFlowBlock(step, rules));
}

export function canvasToDefinition(
  trigger: WorkflowCanvasEventBlock | null,
  flow: WorkflowCanvasFlowBlock[],
  fallbackEventType: string,
): LabWorkflowDefinitionV1 {
  const committed = flowBlocksForDefinition(flow);
  return {
    schemaVersion: LAB_WORKFLOW_DEFINITION_SCHEMA_VERSION,
    trigger: { eventType: trigger?.eventType ?? fallbackEventType },
    steps: committed.map((block) => block.step),
  };
}

export function mergeFlowWithPendingPlaceholders(
  definition: LabWorkflowDefinitionV1,
  rules: LabRuleRecord[],
  pending: WorkflowCanvasFlowBlock[],
): WorkflowCanvasFlowBlock[] {
  const base = definitionToCanvasFlow(definition, rules);
  let merged = [...base];
  const sortedPending = [...pending].sort(
    (a, b) => (a.pendingInsertIndex ?? merged.length) - (b.pendingInsertIndex ?? merged.length),
  );
  for (const placeholder of sortedPending) {
    const idx = Math.min(placeholder.pendingInsertIndex ?? merged.length, merged.length);
    merged = [...merged.slice(0, idx), placeholder, ...merged.slice(idx)];
  }
  return merged;
}

/**
 * The action kinds a business author can add to a graph.
 *
 * The five data nodes (A2–A6) appear **before** the side-effecting ones on purpose: they are the
 * most common step and the ones that make a Code node unnecessary, so they should not require
 * scrolling past four notification variants to find.
 */
export type WorkflowActionPaletteKind =
  | 'set_fields'
  | 'code'
  | 'rename_fields'
  | 'date_time'
  | 'filter_items'
  | 'sort_items'
  | 'if_condition'
  | 'switch_condition'
  | 'split_out'
  | 'merge_items'
  | 'loop'
  | 'wait'
  | 'lab_query_app'
  | 'integration_delete'
  | 'raise_approval'
  | 'ledger_post_entry'
  | 'virtual_bank_get_wallet'
  | 'virtual_bank_credit_daily_allotment'
  | 'show_user_toast'
  | 'http_request'
  | 'notify_users'
  | 'comms_system_dm_payload_user'
  | 'publish_event';

export const WORKFLOW_ACTION_PALETTE: {
  kind: WorkflowActionPaletteKind;
  label: string;
  description: string;
}[] = [
  {
    kind: 'set_fields',
    label: 'Set fields',
    description: 'Add or overwrite fields on each item — the workhorse mapping step.',
  },
  {
    kind: 'code',
    label: 'Code',
    description: 'Transform items with a JavaScript function',
  },
  {
    kind: 'rename_fields',
    label: 'Rename / remove fields',
    description: 'Reshape the item: rename keys, drop the ones you do not need.',
  },
  {
    kind: 'date_time',
    label: 'Date & time',
    description: 'Add, subtract or format a date in a named timezone.',
  },
  {
    kind: 'filter_items',
    label: 'Filter items',
    description: 'Drop items that do not match a condition before the next step sees them.',
  },
  {
    kind: 'sort_items',
    label: 'Sort / limit / dedupe',
    description: 'Order the list, keep the top N, or remove duplicate rows.',
  },
  {
    kind: 'if_condition',
    label: 'IF',
    description: 'Route items down a true branch or a false branch.',
  },
  {
    kind: 'switch_condition',
    label: 'Switch',
    description: 'Route the batch to one of several branches by condition.',
  },
  {
    kind: 'split_out',
    label: 'Split out',
    description: 'Turn an array field on each item into separate items.',
  },
  {
    kind: 'merge_items',
    label: 'Merge',
    description: 'Join branches that converge again — append, pair by position, or join by key.',
  },
  {
    kind: 'loop',
    label: 'Loop',
    description:
      'Repeat the body while a condition holds, up to a cap. Two outputs: While (keep going) and Done.',
  },
  {
    kind: 'wait',
    label: 'Wait',
    description: 'Pause the run before the next step — a reminder a few days later, for example.',
  },
  {
    kind: 'lab_query_app',
    label: 'Query lab app',
    description: 'Read records from a catalog app and continue with what it returns.',
  },
  {
    kind: 'integration_delete',
    label: 'Delete lab record',
    description: 'Remove a record from a catalog app, addressed by a payload field.',
  },
  {
    kind: 'raise_approval',
    label: 'Raise approval',
    description: 'Start an approval request so a person signs off before the next step.',
  },
  {
    kind: 'ledger_post_entry',
    label: 'Post to ledger',
    description: 'Post a balanced entry. Requires a named user who authorised the money movement.',
  },
  {
    kind: 'virtual_bank_get_wallet',
    label: 'Get Quarks wallet',
    description: 'Read play-money balance and daily allotment eligibility without posting accrual.',
  },
  {
    kind: 'virtual_bank_credit_daily_allotment',
    label: 'Credit daily Quarks',
    description: 'Apply the canonical daily Quarks drip (same rules as the wallet API).',
  },
  {
    kind: 'show_user_toast',
    label: 'Show lab toast',
    description: 'PrimeVue toast on the signed-in user’s shell (not the bell inbox).',
  },
  {
    kind: 'http_request',
    label: 'HTTP request',
    description: 'Call an external API. Loopback and private addresses are refused.',
  },
  {
    kind: 'notify_users',
    label: 'Notify lab users',
    description:
      'In-app bell notification. Pick users directly, or name a payload field holding a user id or email.',
  },
  {
    kind: 'comms_system_dm_payload_user',
    label: 'Messages DM (THE-LAB)',
    description: 'Direct message from THE-LAB to a user id or email read from the event payload.',
  },
  {
    kind: 'publish_event',
    label: 'Publish derived event',
    description: 'Emit another domain event on the bus.',
  },
];

export function defaultStepForActionKind(
  kind: WorkflowActionPaletteKind,
  triggerEventType: string,
  defaultUserId?: number,
): LabWorkflowStepV1 {
  switch (kind) {
    // A new data node starts with one empty, editable row rather than an invalid empty array: the
    // editor saves a graph only when the step satisfies its schema, and a zero-row Set node would
    // block the save with an error the user cannot see the cause of.
    case 'set_fields':
      return {
        kind: 'set_fields',
        fields: [{ path: 'field', source: 'literal', value: '' }],
      };
    // A block body rather than a one-liner: a finished expression gives an author nowhere obvious to
    // add a line. No field is named here — a new node has no captured payload yet, and inventing one
    // produces code that parses, runs, and silently does nothing. See `buildCodeNodeExample`.
    case 'code':
      return { kind: 'code', source: buildCodeNodeExample() };
    case 'rename_fields':
      return { kind: 'rename_fields', renames: [], remove: [] };
    case 'date_time':
      return {
        kind: 'date_time',
        operations: [{ source: 'createdAt', op: 'add', amount: 1, unit: 'days' }],
      };
    case 'filter_items':
      return {
        kind: 'filter_items',
        conditions: [{ kind: 'payload_exists', path: 'assigneeId' }],
      };
    case 'sort_items':
      return { kind: 'sort_items', sort: [{ path: 'createdAt', direction: 'desc' }] };
    case 'if_condition':
      return {
        kind: 'if_condition',
        conditions: [{ kind: 'payload_exists', path: 'assigneeId' }],
      };
    case 'switch_condition':
      return {
        kind: 'switch_condition',
        routings: [
          {
            label: 'First',
            conditions: [{ kind: 'payload_equals', path: 'status', value: 'open' }],
          },
        ],
      };
    case 'split_out':
      return { kind: 'split_out', path: 'items' };
    // `append` with no key is the only default that runs without further editing: a new by-key merge
    // would be invalid until the user names a key, and `by_index` silently drops rows when branch
    // lengths differ.
    case 'merge_items':
      return { kind: 'merge_items', mode: 'append' };
    case 'loop':
      // A cap is required, so the default must have one: 3 is the smallest number that demonstrates
      // both an iteration and a termination.
      return { kind: 'loop', maxIterations: 3 };
    case 'wait':
      return { kind: 'wait', amount: 1, unit: 'days' };
    // A platform node starts deliberately **invalid** (empty provider, empty key, no lines): an
    // empty app id points at no app, so the editor must make the author choose rather than silently
    // defaulting to whichever app happened to be first in the list.
    case 'lab_query_app':
      return { kind: 'lab_query_app', providerAppId: '', serviceId: '' };
    case 'integration_delete':
      return { kind: 'integration_delete', providerAppId: '', serviceId: '', recordIdPath: 'id' };
    case 'raise_approval':
      return { kind: 'raise_approval', policyId: '', title: 'Approval required' };
    case 'ledger_post_entry':
      return { kind: 'ledger_post_entry', memo: 'Workflow entry', lines: [], confirmedByUserId: 0 };
    case 'virtual_bank_get_wallet':
      return { kind: 'virtual_bank_get_wallet', userIdPath: 'userId' };
    case 'virtual_bank_credit_daily_allotment':
      return { kind: 'virtual_bank_credit_daily_allotment', userIdPath: 'userId' };
    case 'show_user_toast':
      return {
        kind: 'show_user_toast',
        userIdPath: 'userId',
        severity: 'info',
        summary: 'Workflow toast',
        detail: '',
      };
    // Empty URL: the author must type the target, and the schema rejects `''`, which is what makes
    // "not configured yet" visible as a validation error instead of a request to nowhere.
    case 'http_request':
      return { kind: 'http_request', method: 'GET', url: '' };
    case 'notify_users':
      return { kind: 'notify_users', userIds: defaultUserId != null ? [defaultUserId] : [] };
    case 'comms_system_dm_payload_user':
      return { kind: 'comms_system_dm_payload_user', path: 'assigneeId' };
    case 'publish_event':
      return {
        kind: 'publish_event',
        type: triggerEventType,
        sourceAppId: 'platform-workflows',
      };
    default:
      return { kind: 'notify_users', userIds: [] };
  }
}

export function flowBlockFromRule(rule: LabRuleRecord): WorkflowCanvasFlowBlock {
  const step: LabWorkflowStepV1 = { kind: 'rule_ref', ruleId: rule.id };
  return stepToFlowBlock(step, [rule]);
}

export function flowBlockFromAction(
  kind: WorkflowActionPaletteKind,
  triggerEventType: string,
  defaultUserId?: number,
): WorkflowCanvasFlowBlock {
  const step = defaultStepForActionKind(kind, triggerEventType, defaultUserId);
  return stepToFlowBlock(step, []);
}

export function refreshFlowBlockDisplay(
  block: WorkflowCanvasFlowBlock,
  rules: LabRuleRecord[],
): WorkflowCanvasFlowBlock {
  const refreshed = stepToFlowBlock(block.step, rules);
  return { ...refreshed, dragId: block.dragId };
}
