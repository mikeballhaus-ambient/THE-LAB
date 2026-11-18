import { z } from 'zod';
import type { User } from '@/shared/types/user';
import type { LabWorkflowDefinition } from '@/shared/types/lab-workflow';
import {
  LAB_WORKFLOW_MCP_MAX_ARRAY_ITEMS,
  LAB_WORKFLOW_MCP_MAX_DEPTH,
  LAB_WORKFLOW_MCP_MAX_STRING_CHARS,
} from '@/shared/types/schemas/lab-workflow-mcp-schemas';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabDomainEventCatalogResponse } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { labEventsService } from '@/backend/db/LabEvents/lab-events-service';
import { labIntegrationsHubService } from '@/backend/lab-integrations/lab-integrations-hub-service';
import { WORKFLOW_ACTION_PALETTE } from '@/shared/utils/lab-workflow-definition-canvas';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';
import { LAB_LEDGER_APP_ID } from '@/shared/config/platform-lab-product-app-ids';

/**
 * Read-only discovery for the Workflow MCP server (M0).
 *
 * ## Why the node catalogue is **derived**, not authored
 *
 * The palette a human drags from and the schema an agent must satisfy are the same contract. If the
 * MCP server restated the node list, adding a node would leave the two disagreeing — and the agent
 * would build a graph the validator rejects with a message about a node kind it was never offered.
 * [`WORKFLOW_ACTION_PALETTE`](../../../shared/utils/lab-workflow-definition-canvas.ts) supplies
 * labels and descriptions; [`LabWorkflowStepSchema`](../../../shared/types/schemas/lab-workflow-step-schema.ts)
 * supplies the parameters, converted to JSON Schema so an agent can read required fields.
 *
 * ## Decoupling (AGENTS.md #10)
 *
 * Core must not import catalog app code. The service catalogue comes from the registry via
 * [`labIntegrationsHubService`](../../lab-integrations/lab-integrations-hub-service.ts), which reads
 * manifests by registry id — the same source Workflow Studio's connector picker uses.
 */

/** Where a node appears in the palette. Kept stable so an agent can filter on it. */
export type WorkflowNodeCategory =
  | 'trigger'
  | 'flow'
  | 'data'
  | 'routing'
  | 'pacing'
  | 'platform'
  | 'external'
  | 'actions'
  | 'integrations';

/**
 * Palette categories.
 *
 * Mirrors the designer's sections on purpose: an agent that can name the same groups a user sees can
 * explain its choices in those terms. `notify_*` and friends are `actions`; the pure transforms are
 * `data`; anything that writes outside the workflow is `platform`, `external` or `integrations`,
 * which is also the set an author is most likely to want to dry-run first.
 */
const CATEGORY_BY_STEP_KIND: Record<string, WorkflowNodeCategory> = {
  set_fields: 'data',
  rename_fields: 'data',
  date_time: 'data',
  filter_items: 'data',
  sort_items: 'data',
  if_condition: 'routing',
  switch_condition: 'routing',
  split_out: 'routing',
  merge_items: 'routing',
  wait: 'pacing',
  lab_query_app: 'platform',
  integration_delete: 'integrations',
  raise_approval: 'platform',
  ledger_post_entry: 'platform',
  http_request: 'external',
  notify_users: 'actions',
  comms_system_dm_payload_user: 'actions',
  publish_event: 'actions',
  integration_create: 'integrations',
  integration_update: 'integrations',
  rule_ref: 'flow',
};

export interface WorkflowNodeTypeDescriptor {
  kind: string;
  label: string;
  description: string;
  category: WorkflowNodeCategory;
  /**
   * `always` — the node posts to the ledger unconditionally, so a graph containing it requires
   * `confirmMoneyWrites: true`.
   *
   * `conditional` — an integration write, which moves money only when it targets the Financial
   * Ledger app. The handler inspects the step's `providerAppId`; discovery cannot, because it is a
   * property of the configured step rather than of the kind.
   *
   * `false` — no money effect.
   */
  writesMoney: 'always' | 'conditional' | false;
  /** JSON Schema for the step object, or undefined when `includeSchemas: false`. */
  parameters?: Record<string, unknown>;
}

/**
 * Node **kinds** — the graph-level shapes, as distinct from step kinds.
 *
 * An agent needs both: "an action node with a `filter_items` step" is the real unit, and the graph
 * nodes (`trigger`, `condition`, `rule`, `group`) are not steps at all.
 */
export interface WorkflowGraphNodeKindDescriptor {
  kind: 'trigger' | 'condition' | 'rule' | 'action' | 'group';
  label: string;
  description: string;
  requiredFields: string[];
}

export const WORKFLOW_GRAPH_NODE_KINDS: WorkflowGraphNodeKindDescriptor[] = [
  {
    kind: 'trigger',
    label: 'Trigger',
    description:
      'Exactly one per workflow. Its `eventType` must match a lab domain event (see ' +
      'lab_workflow_list_trigger_events). The matching payload becomes the run\'s single item. ' +
      'An OPTIONAL `schedule` object — `{ kind: cron | interval | recurrence, expression?, timezone, ' +
      'intervalMinutes? }` — makes the workflow fire on the clock as well: `timezone` must be an IANA ' +
      'name, `expression` is a 5-field cron (minute hour day-of-month month day-of-week) or an RRULE ' +
      'body, and `interval` uses `intervalMinutes`. `relative` / `staleness` are NOT available (they ' +
      'need a per-record date the scheduler never has). Prefer lab_workflow_set_schedule over hand-' +
      'editing this field: it validates and returns the computed nextFireAt.',
    requiredFields: ['id', 'position', 'eventType'],
  },
  {
    kind: 'condition',
    label: 'Condition',
    description:
      'Decision node. Passes items through unchanged and routes down on_true / on_false edges. ' +
      'Cheaper than an IF step when the whole batch shares one decision.',
    requiredFields: ['id', 'position', 'conditions'],
  },
  {
    kind: 'rule',
    label: 'Rule',
    description:
      'Decision node authored inline (`name` + `conditions`) — preferred. `ruleId` links a legacy ' +
      'library rule and should not be used for new graphs. Passes items through unchanged.',
    requiredFields: ['id', 'position'],
  },
  {
    kind: 'action',
    label: 'Action',
    description:
      'Does the work. `step.kind` selects the operation — see the step catalogue. May carry ' +
      '`retry`, `timeoutMs` and `idempotencyKey` execution policy.',
    requiredFields: ['id', 'position', 'step'],
  },
  {
    kind: 'group',
    label: 'Group',
    description:
      'Container for member nodes. `groupType: actions` runs members sequentially (a chain) or in ' +
      'parallel (a fan-out); `groupType: rules` combines member rules.',
    requiredFields: ['id', 'position', 'label'],
  },
];

/**
 * Convert one step schema to JSON Schema.
 *
 * Zod 4 can do this natively. A conversion failure is contained per node: an agent still gets the
 * kind, label and description for every node, and only the one unrepresentable schema is omitted.
 * Returning `undefined` silently would look like "this node takes no parameters", which is the
 * misreading that leads to a validation failure the agent cannot explain.
 */
function stepParametersSchema(stepSchema: z.ZodTypeAny): Record<string, unknown> | undefined {
  try {
    return z.toJSONSchema(stepSchema, { io: 'input' }) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Step members of the discriminated union, in schema order (which is also palette order). */
function stepSchemaMembers(): { kind: string; schema: z.ZodTypeAny }[] {
  const options = (LabWorkflowStepSchema as unknown as { options?: z.ZodTypeAny[] }).options;
  if (!Array.isArray(options)) {
    return [];
  }
  const members: { kind: string; schema: z.ZodTypeAny }[] = [];
  for (const option of options) {
    const shape = (option as unknown as { shape?: Record<string, z.ZodTypeAny> }).shape;
    const kindLiteral = shape?.kind as unknown as { value?: string } | undefined;
    const kind = kindLiteral?.value;
    if (typeof kind === 'string') {
      members.push({ kind, schema: option });
    }
  }
  return members;
}

/**
 * True when a step can move money.
 *
 * Deliberately a **closed** list rather than a heuristic on the field name. The owner's rule is that
 * money must be deliberate, so a new node type that moves money has to be added here — which is a
 * reviewable omission, whereas "anything mentioning `amount`" would quietly classify new nodes.
 */
export function stepWritesMoney(step: LabWorkflowStepV1): boolean {
  if (step.kind === 'ledger_post_entry') {
    return true;
  }
  if (
    (step.kind === 'integration_create' || step.kind === 'integration_update') &&
    step.providerAppId === LAB_LEDGER_APP_ID
  ) {
    return true;
  }
  return false;
}

/** Every step kind, with parameters. Ordered by palette, then any schema-only kinds. */
export function listWorkflowNodeTypes(includeSchemas = true): WorkflowNodeTypeDescriptor[] {
  const paletteByKind = new Map(WORKFLOW_ACTION_PALETTE.map((entry) => [entry.kind, entry]));
  const members = stepSchemaMembers();
  const described: WorkflowNodeTypeDescriptor[] = [];

  for (const member of members) {
    const paletteEntry = paletteByKind.get(member.kind as never);
    described.push({
      kind: member.kind,
      label: paletteEntry?.label ?? member.kind,
      description: paletteEntry?.description ?? 'Step kind accepted by the validator.',
      category: CATEGORY_BY_STEP_KIND[member.kind] ?? 'actions',
      writesMoney: stepKindWritesMoney(member.kind),
      ...(includeSchemas ? { parameters: stepParametersSchema(member.schema) } : {}),
    });
  }

  // Palette entries without a schema member would be a real defect, not a discovery gap — surface
  // them rather than silently dropping them, so the two lists cannot drift unnoticed.
  for (const entry of WORKFLOW_ACTION_PALETTE) {
    if (members.some((member) => member.kind === entry.kind)) {
      continue;
    }
    described.push({
      kind: entry.kind,
      label: entry.label,
      description: `${entry.description} (No parameter schema is registered for this kind.)`,
      category: CATEGORY_BY_STEP_KIND[entry.kind] ?? 'actions',
      writesMoney: stepKindWritesMoney(entry.kind),
    });
  }

  return described;
}

/**
 * Money effect of a step **kind**.
 *
 * `integration_create`/`integration_update` are money-writing only against the ledger, which depends
 * on the configured `providerAppId` rather than on the kind — hence `conditional` rather than a
 * boolean guess that would either over-warn on every connector write or under-warn on the one that
 * matters.
 */
function stepKindWritesMoney(
  kind: string,
): WorkflowNodeTypeDescriptor['writesMoney'] {
  if (kind === 'ledger_post_entry') {
    return 'always';
  }
  if (kind === 'integration_create' || kind === 'integration_update') {
    return 'conditional';
  }
  return false;
}

/**
 * Does this definition move money?
 *
 * Returns the offending step kinds so the refusal can name them. A bare boolean would force the agent
 * to re-derive why it was rejected, and "confirm money writes" with no subject is the kind of prompt
 * a user approves without reading.
 */
export function findMoneyWritingSteps(
  definition: LabWorkflowDefinition,
): { nodeId: string; stepKind: string; providerAppId?: string }[] {
  if (!isLabWorkflowDefinitionV2(definition)) {
    return definition.steps
      .map((step, index) => ({ step, nodeId: `step-${index + 1}` }))
      .filter(({ step }) => stepWritesMoney(step))
      .map(({ step, nodeId }) => ({
        nodeId,
        stepKind: step.kind,
        ...('providerAppId' in step ? { providerAppId: step.providerAppId } : {}),
      }));
  }
  const found: { nodeId: string; stepKind: string; providerAppId?: string }[] = [];
  for (const node of definition.nodes) {
    if (node.kind !== 'action') {
      continue;
    }
    if (!stepWritesMoney(node.step)) {
      continue;
    }
    found.push({
      nodeId: node.id,
      stepKind: node.step.kind,
      ...('providerAppId' in node.step ? { providerAppId: node.step.providerAppId } : {}),
    });
  }
  return found;
}

/**
 * The trigger palette: declared catalog entries merged with types actually seen on the bus.
 *
 * `neverFired` is carried through because it is the single most useful field for an agent authoring
 * a trigger: a declared-but-silent event saves cleanly and never fires, and an agent that cannot see
 * that will confidently build a workflow that does nothing.
 */
export function listTriggerEvents(appId?: string): LabDomainEventCatalogResponse {
  const catalog = labEventsService.getEventCatalog();
  if (!appId) {
    return catalog;
  }
  return {
    ...catalog,
    entries: catalog.entries.filter((entry) => entry.sourceAppId === appId),
    observedOnly: catalog.observedOnly.filter((entry) => entry.sourceAppId === appId),
  };
}

/**
 * Connector services a workflow can read from or write to.
 *
 * Comes from the registry manifests, filtered by what the caller may read — the same permission path
 * as the designer's connector picker, so an agent cannot enumerate services a user cannot see.
 */
export function listAppServices(caller: User, appId?: string): LabIntegrationServiceCatalogResponse {
  const catalog = labIntegrationsHubService.listIntegrationServiceCatalogForCaller(caller);
  if (!appId) {
    return catalog;
  }
  return { ...catalog, apps: catalog.apps.filter((app) => app.appId === appId) };
}

// ---------------------------------------------------------------------------------------------
// Response shaping (M2.7)
// ---------------------------------------------------------------------------------------------

/** A marker placed where content was removed, so a cut is never silent. */
export interface WorkflowMcpTruncationMarker {
  truncated: true;
  reason: string;
  originalLength?: number;
  originalKeys?: number;
  omittedKeys?: string[];
}

export function isTruncationMarker(value: unknown): value is WorkflowMcpTruncationMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { truncated?: unknown }).truncated === true
  );
}

/**
 * Cap a value for transport to an agent.
 *
 * Every cut is replaced with a marker naming what was dropped. The alternative — returning the first
 * N entries silently — teaches an agent a false fact about the data, and that false fact is then
 * baked into a graph (a limit node set to 20 because "there were 20 rows").
 */
export function truncateForMcp(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    if (value.length <= LAB_WORKFLOW_MCP_MAX_STRING_CHARS) {
      return value;
    }
    return {
      truncated: true,
      reason: 'string_too_long',
      originalLength: value.length,
      preview: value.slice(0, LAB_WORKFLOW_MCP_MAX_STRING_CHARS),
    } satisfies WorkflowMcpTruncationMarker & { preview: string };
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (depth >= LAB_WORKFLOW_MCP_MAX_DEPTH) {
    return {
      truncated: true,
      reason: 'max_depth',
      originalKeys: typeof value === 'object' ? Object.keys(value as object).length : undefined,
    } satisfies WorkflowMcpTruncationMarker;
  }
  if (Array.isArray(value)) {
    const capped = value.slice(0, LAB_WORKFLOW_MCP_MAX_ARRAY_ITEMS).map((entry) =>
      truncateForMcp(entry, depth + 1),
    );
    if (value.length <= LAB_WORKFLOW_MCP_MAX_ARRAY_ITEMS) {
      return capped;
    }
    return [
      ...capped,
      {
        truncated: true,
        reason: 'array_too_long',
        originalLength: value.length,
      } satisfies WorkflowMcpTruncationMarker,
    ];
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = truncateForMcp(entry, depth + 1);
    }
    return out;
  }
  // Functions, symbols and bigints are not JSON; surface the fact rather than `undefined`.
  return { truncated: true, reason: 'unsupported_type', type: typeof value };
}

/** Shape a run's step detail so an oversized `wouldWrite` payload cannot dominate the response. */
export function truncateStepDetail(detail: Record<string, unknown> | null): unknown {
  return detail == null ? null : truncateForMcp(detail);
}
