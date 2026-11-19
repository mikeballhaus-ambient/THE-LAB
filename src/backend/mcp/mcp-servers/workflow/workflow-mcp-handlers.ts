import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { MCPToolResponse } from '@/shared/types';
import type { User } from '@/shared/types/user';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowDefinition, LabWorkflowRecord } from '@/shared/types/lab-workflow';
import type { LabWorkflowMockSample } from '@/shared/types/lab-workflow-mock-sample';
import { LabDomainEventPublishSchema } from '@/shared/types/schemas/lab-domain-event-schema';
import { LabWorkflowDefinitionSchema } from '@/shared/types/schemas/lab-workflow-schema';
import type {
  LabWorkflowCreateParams,
  LabWorkflowListenParams,
  LabWorkflowListParams,
  LabWorkflowMockSamplesParams,
  LabWorkflowPublishVersionParams,
  LabWorkflowRunParams,
  LabWorkflowSetScheduleParams,
  LabWorkflowUpdateParams,
  LabWorkflowValidateParams,
} from '@/shared/types/schemas/lab-workflow-mcp-schemas';
import {
  LAB_WORKFLOW_MCP_LISTEN_DEFAULT_WAIT_MS,
  LAB_WORKFLOW_MCP_LISTEN_MAX_WAIT_MS,
  LAB_WORKFLOW_MCP_LISTEN_POLL_MS,
  LAB_WORKFLOW_MCP_MAX_ITEMS,
} from '@/shared/types/schemas/lab-workflow-mcp-schemas';
import {
  disarmListen,
  getListen,
  armListen,
  LAB_WORKFLOW_LISTEN_TTL_MS,
} from '@/shared/types/lab-workflow-listen';
import { UserService } from '@/backend/db/Auth/auth-service';
import { ProviderService } from '@/backend/ai/provider-service';
import {
  LabWorkflowsError,
  isPlatformWorkflowsAdmin,
  labWorkflowsService,
} from '@/backend/db/LabWorkflows/lab-workflows-service';
import { labWorkflowRunsRepository } from '@/backend/db/LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowWebhooksRepository } from '@/backend/db/LabWorkflows/lab-workflow-webhooks-repository';
import { labEventsRepository } from '@/backend/db/LabEvents/lab-events-repository';
import { platformAuditService } from '@/backend/db/PlatformAudit/platform-audit-service';
import { getWorkflowTriggerEventType } from '@/shared/utils/lab-workflow-definition';
import { validateWorkflowDefinition } from '@/shared/utils/validate-lab-workflow-definition';
import { loadDeclaredDomainEventCatalogEntries } from '@/backend/lab-events/declared-domain-event-catalog';
import type { LabWorkflowValidationResult } from '@/shared/utils/validate-lab-workflow-definition';
import {
  WORKFLOW_GRAPH_NODE_KINDS,
  findMoneyWritingSteps,
  listAppServices,
  listTriggerEvents,
  listWorkflowNodeTypes,
  truncateForMcp,
  truncateStepDetail,
} from './workflow-reader';

/**
 * Handler layer for the Workflow MCP server.
 *
 * Every tool **delegates to the service** and never touches SQL: validation, scope filtering,
 * permission refusal and enable limits live in one place. That is not tidiness — two other callers
 * (the platform routes and the integration-connector route) already go through the same service, and
 * an MCP tool with its own INSERT would be the path that quietly creates a graph nobody validated.
 *
 * Return shape is `{ success, content }`, where `content` is JSON. An agent reads the JSON, so every
 * failure names what was wrong *and* what to do next rather than returning a bare 403.
 */

function toolError(message: string, payload: Record<string, unknown> = {}): MCPToolResponse {
  return {
    type: 'tool_result',
    tool_call_id: 'lab_workflow',
    function: 'lab_workflow',
    content: JSON.stringify({ success: false, error: message, ...payload }, null, 2),
    success: false,
  };
}

function toolSuccess(payload: unknown): MCPToolResponse {
  return {
    type: 'tool_result',
    tool_call_id: 'lab_workflow',
    function: 'lab_workflow',
    content: JSON.stringify({ success: true, ...(payload as Record<string, unknown>) }, null, 2),
    success: true,
  };
}

/**
 * Resolve the calling user.
 *
 * The id arrives as a tool argument because MCP has no ambient session. A missing user is refused
 * rather than defaulted to the system account: an agent acting on behalf of nobody must not be able
 * to create a global workflow.
 *
 * The lookup is wrapped because it reaches SQLite, and a tool must never answer a caller with a raw
 * driver error — an agent cannot act on "Cannot read properties of undefined", and the same failure
 * (repositories not bootstrapped) must be distinguishable from "that user does not exist".
 */
function resolveCaller(userId: number): User | MCPToolResponse {
  let user: User | null;
  try {
    user = UserService.getInstance().getUserById(userId);
  } catch (err) {
    return toolError(
      'The platform database is not available, so the calling user cannot be resolved. ' +
        'Workflow tools are only usable once the backend has finished its startup bootstrap.',
      { code: 'UNAVAILABLE', detail: err instanceof Error ? err.message : String(err) },
    );
  }
  if (!user) {
    return toolError(`User not found for userId ${userId}.`, {
      code: 'NOT_FOUND',
      hint: 'Pass the platform user id from the system instructions {{USERID}} context.',
    });
  }
  return user;
}

function mapWorkflowError(err: unknown): MCPToolResponse {
  if (err instanceof LabWorkflowsError) {
    return toolError(`${err.code}: ${err.message}`, {
      code: err.code,
      issues: err.issues ?? null,
      hint:
        err.code === 'FORBIDDEN'
          ? 'The caller lacks permission for this workflow. A member sees only their own user-scoped workflows; a viewer cannot author or run.'
          : err.code === 'NOT_FOUND'
            ? 'Check the workflow id with lab_workflow_list.'
            : undefined,
    });
  }
  if (err instanceof z.ZodError) {
    return toolError('INVALID_INPUT: the request body did not match the schema.', {
      code: 'INVALID_INPUT',
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  const message = err instanceof Error ? err.message : String(err);
  return toolError(message);
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

export interface WorkflowDefinitionValidation extends LabWorkflowValidationResult {
  /** True when the shape is right but structure is not — the distinction matters for the agent. */
  shapeError?: boolean;
}

/**
 * Validate a definition with **both** halves of the contract.
 *
 * The Zod schema answers "is this the right shape"; [`validateWorkflowDefinition`] answers "can this
 * graph run". Only running both gives errors an agent can act on: a dangling edge is not a shape
 * problem, and a missing `step` is not a structure problem.
 *
 * Observed event types are passed in so a real-but-undocumented trigger warns as unknown rather than
 * being reported as a typo.
 */
export function validateDefinitionInput(definition: unknown): WorkflowDefinitionValidation {
  const parsed = LabWorkflowDefinitionSchema.safeParse(definition);
  if (!parsed.success) {
    return {
      valid: false,
      shapeError: true,
      errors: parsed.error.issues.map((issue) => ({
        severity: 'error' as const,
        code: 'unknown_node_kind' as const,
        targetId: issue.path.length ? issue.path.join('.') : null,
        message: `${issue.path.join('.') || 'definition'}: ${issue.message}`,
      })),
      warnings: [],
    };
  }

  const observed = labEventsRepository.listDistinctEventTypes(200);

  // A v1 definition has no graph to walk; the schema already enforced its step constraints.
  if (parsed.data.schemaVersion !== 2) {
    return { valid: true, errors: [], warnings: [] };
  }
  return validateWorkflowDefinition(parsed.data, {
    observedEventTypes: observed,
    declaredCatalogEntries: loadDeclaredDomainEventCatalogEntries(),
  });
}

function validationPayload(result: WorkflowDefinitionValidation): Record<string, unknown> {
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };
}

// ---------------------------------------------------------------------------------------------
// Money guard (M3.4)
// ---------------------------------------------------------------------------------------------

/**
 * Refuse a money-writing graph unless the caller has explicitly confirmed it.
 *
 * ## Why the flag lives on the tool and not on the node
 *
 * `ledger_post_entry` already requires `confirmedByUserId`, naming the human who authorised the
 * movement. That is the *runtime* answer to "who approved this". This guard answers a different
 * question — "did the person commissioning this automation understand that it moves money?" — and a
 * user id in a JSON blob does not prove that. So the confirmation is a separate, auditable act.
 *
 * The audit row is written **at authoring time**, with the offending node ids, so a later
 * investigation can answer "who introduced the money write, and did they confirm it?" without
 * reconstructing it from the run history.
 */
interface MoneyConfirmation {
  moneySteps: { nodeId: string; stepKind: string; providerAppId?: string }[];
}

/**
 * Check the guard and **return** what it found, without writing anything.
 *
 * Two-phase on purpose. The audit row names the workflow id, and on `create` that id does not exist
 * until the insert succeeds — recording first would either point at `'new'` (unactionable during an
 * investigation) or claim confirmation for a graph the service then rejected. So: check, persist,
 * audit.
 */
function checkMoneyGuard(
  definition: LabWorkflowDefinition,
  confirmed: boolean | undefined,
): MoneyConfirmation {
  const moneySteps = findMoneyWritingSteps(definition);
  if (moneySteps.length === 0) {
    return { moneySteps };
  }
  if (confirmed !== true) {
    throw new LabWorkflowsError(
      'INVALID_INPUT',
      `This workflow moves money (${moneySteps
        .map((step) => `${step.nodeId}:${step.stepKind}`)
        .join(', ')}). ` +
        'Ask the user for explicit approval, then call again with confirmMoneyWrites: true.',
    );
  }
  return { moneySteps };
}

/** Write the confirmation once the workflow id is known, so the row is investigable. */
function recordMoneyConfirmation(
  caller: User,
  confirmation: MoneyConfirmation,
  operation: 'create' | 'update' | 'duplicate',
  workflowId: string,
): void {
  if (confirmation.moneySteps.length === 0) {
    return;
  }
  platformAuditService.record({
    actorUserId: caller.userId,
    category: 'workflow',
    action: `lab_workflow.${operation}.money_writes_confirmed`,
    targetType: 'workflow',
    targetId: workflowId,
    details: { operation, moneySteps: confirmation.moneySteps },
  });
}

// ---------------------------------------------------------------------------------------------
// M0 — discovery
// ---------------------------------------------------------------------------------------------

export async function labWorkflowListNodeTypes(params: {
  userId: number;
  includeSchemas?: boolean;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const includeSchemas = params.includeSchemas !== false;
    const stepKinds = listWorkflowNodeTypes(includeSchemas);
    return toolSuccess({
      graphNodeKinds: WORKFLOW_GRAPH_NODE_KINDS,
      stepKinds,
      categories: [...new Set(stepKinds.map((node) => node.category))].sort(),
      note:
        'A graph is `{ schemaVersion: 2, nodes, edges }`. Every node needs a UUID `id` and a ' +
        '`position`; edges need `{ id, source, target, when }` plus `outputIndex` when they leave a ' +
        'routing node (IF ports 0/1, Switch port per routing, fallback at routings.length). ' +
        'Call lab_workflow_validate before create.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowListTriggerEvents(params: {
  userId: number;
  appId?: string;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const catalog = listTriggerEvents(params.appId);
    const neverFired = catalog.entries.filter((entry) => entry.neverFired).length;
    return toolSuccess({
      ...catalog,
      neverFiredCount: neverFired,
      note:
        neverFired > 0
          ? `${neverFired} declared event type(s) have never been published in this lab (neverFired: true). ` +
            'A workflow on one of those saves cleanly and will not fire until a publisher ships — tell the user.'
          : 'Every declared event type has been observed at least once.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowListAppServices(params: {
  userId: number;
  appId?: string;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const catalog = listAppServices(caller, params.appId);
    return toolSuccess({
      ...catalog,
      note:
        'These are connector services for `lab_query_app`, `integration_create`, `integration_update` ' +
        'and `integration_delete`. `serviceId` goes on the step, and a connector write into ' +
        "`app-lab-financial-ledger` counts as a money write (confirmMoneyWrites).",
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowValidate(
  params: LabWorkflowValidateParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  const result = validateDefinitionInput(params.definition);
  return toolSuccess({
    ...validationPayload(result),
    ...(result.shapeError
      ? {
          hint:
            'The definition did not match the schema. Call lab_workflow_list_node_types for each ' +
            "node's required fields — `step.kind` must be one of the listed kinds.",
        }
      : {}),
  });
}

// ---------------------------------------------------------------------------------------------
// M1 — authoring
// ---------------------------------------------------------------------------------------------

function summarizeWorkflow(workflow: LabWorkflowRecord): Record<string, unknown> {
  return {
    workflowId: workflow.id,
    name: workflow.name,
    description: workflow.description ?? null,
    scope: workflow.scope,
    ownerUserId: workflow.ownerUserId,
    enabled: workflow.enabled,
    priority: workflow.priority,
    tags: workflow.tags ?? [],
    triggerEventType: getWorkflowTriggerEventType(workflow.definition) || null,
    updatedAt: workflow.updatedAt,
  };
}

export async function labWorkflowList(params: LabWorkflowListParams): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const includeDisabled = params.includeDisabled !== false;
    const workflows = labWorkflowsService
      .listForCaller(caller, { scope: params.scope, ownerUserId: params.ownerUserId })
      .filter((workflow) => includeDisabled || workflow.enabled);
    return toolSuccess({
      workflows: workflows.map(summarizeWorkflow),
      count: workflows.length,
      scopeNote: isPlatformWorkflowsAdmin(caller)
        ? 'Admin view: global and user-scoped workflows.'
        : 'Member view: only your own user-scoped workflows. Global workflows are invisible here.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowGet(params: {
  userId: number;
  workflowId: string;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const workflow = labWorkflowsService.getForCaller(caller, params.workflowId);
    if (!workflow) {
      return toolError('NOT_FOUND: Workflow not found.', { code: 'NOT_FOUND' });
    }
    return toolSuccess({
      workflow: summarizeWorkflow(workflow),
      definition: workflow.definition,
      validation: validationPayload(
        validateDefinitionInput(workflow.definition),
      ),
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowCreate(
  params: LabWorkflowCreateParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    // Validate **before** anything is written, and return the same issues `validate` would. The
    // service would also refuse, but only as an aggregated message — the structured payload is what
    // lets an agent correct the graph in one turn instead of guessing.
    const validation = validateDefinitionInput(params.definition);
    if (!validation.valid) {
      return toolError('INVALID_DEFINITION: the workflow graph cannot run as written.', {
        code: 'INVALID_DEFINITION',
        validation: validationPayload(validation),
      });
    }

    const money = checkMoneyGuard(
      params.definition as unknown as LabWorkflowDefinition,
      params.confirmMoneyWrites,
    );

    const workflowId = randomUUID();
    // Members must not choose their own scope: the service forces `user` + caller ownership, so
    // sending a scope would be silently overwritten. Omitting it is the honest request.
    const scope = isPlatformWorkflowsAdmin(caller) ? (params.scope ?? 'user') : undefined;
    // A `global` workflow must carry NO owner — the create schema rejects `ownerUserId` alongside
    // `global`, so attaching one here would make an admin's first global workflow fail validation.
    const ownerUserId =
      scope === 'global'
        ? undefined
        : isPlatformWorkflowsAdmin(caller)
          ? (params.ownerUserId ?? caller.userId)
          : undefined;

    const workflow = labWorkflowsService.createForCaller(caller, {
      id: workflowId,
      name: params.name,
      ...(params.description !== undefined ? { description: params.description } : {}),
      ...(scope ? { scope } : {}),
      ...(ownerUserId != null ? { ownerUserId } : {}),
      ...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
      ...(params.priority !== undefined ? { priority: params.priority } : {}),
      definition: params.definition,
    });

    recordMoneyConfirmation(caller, money, 'create', workflow.id);

    return toolSuccess({
      workflowId: workflow.id,
      workflow: summarizeWorkflow(workflow),
      validation: validationPayload(validation),
      moneyWritesConfirmed: money.moneySteps.length > 0,
      next:
        'Call lab_workflow_dry_run to check behaviour, then lab_workflow_run to execute for real. ' +
        'A new workflow is enabled immediately unless `enabled: false` was sent.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowUpdate(
  params: LabWorkflowUpdateParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const existing = labWorkflowsService.getForCaller(caller, params.workflowId);
    if (!existing) {
      return toolError('NOT_FOUND: Workflow not found.', { code: 'NOT_FOUND' });
    }

    // The guard applies to the graph that will be live **after** the update. Sending only `enabled`
    // must not re-confirm an existing money write, so the check runs on the resulting definition
    // and the audit row is only written when a money-writing definition is actually submitted.
    const nextDefinition = (params.definition ?? existing.definition) as unknown;
    const validation = validateDefinitionInput(nextDefinition);
    if (!validation.valid) {
      return toolError('INVALID_DEFINITION: the workflow graph cannot run as written.', {
        code: 'INVALID_DEFINITION',
        validation: validationPayload(validation),
      });
    }
    const money =
      params.definition !== undefined
        ? checkMoneyGuard(
            nextDefinition as LabWorkflowDefinition,
            params.confirmMoneyWrites,
          )
        : null;

    const workflow = labWorkflowsService.updateForCaller(caller, params.workflowId, {
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.description !== undefined ? { description: params.description } : {}),
      ...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
      ...(params.priority !== undefined ? { priority: params.priority } : {}),
      ...(params.definition !== undefined ? { definition: params.definition } : {}),
    });

    if (money) {
      recordMoneyConfirmation(caller, money, 'update', workflow.id);
    }

    return toolSuccess({
      workflowId: workflow.id,
      workflow: summarizeWorkflow(workflow),
      validation: validationPayload(validation),
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

/**
 * Duplicate a workflow (M1.3).
 *
 * Building by copy is the business-user pattern: "like the one that works, but for invoices". The
 * definition is copied **verbatim**, including node ids, because ids only need to be unique within
 * one graph — re-minting them would break any mock sample or schedule that references a trigger
 * node id, for no benefit.
 *
 * Runs, steps and mock samples are deliberately **not** copied: history belongs to the workflow it
 * happened in, and a duplicate that inherits someone else's run history would make the run panel lie.
 */
export async function labWorkflowDuplicate(params: {
  userId: number;
  workflowId: string;
  name?: string;
  scope?: 'global' | 'user';
  ownerUserId?: number;
  confirmMoneyWrites?: boolean;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const source = labWorkflowsService.getForCaller(caller, params.workflowId);
    if (!source) {
      return toolError('NOT_FOUND: Workflow not found.', { code: 'NOT_FOUND' });
    }

    const money = checkMoneyGuard(source.definition, params.confirmMoneyWrites);

    const workflowId = randomUUID();
    const admin = isPlatformWorkflowsAdmin(caller);
    const scope = admin ? (params.scope ?? source.scope) : undefined;
    // `global` must not carry an owner (see labWorkflowCreate): the create schema rejects the pair,
    // so a duplicate of a global workflow would otherwise fail on the very field it copied.
    const ownerUserId = admin
      ? scope === 'global'
        ? null
        : (params.ownerUserId ?? source.ownerUserId ?? caller.userId)
      : undefined;

    const workflow = labWorkflowsService.createForCaller(caller, {
      id: workflowId,
      name: params.name?.trim() || `${source.name} (copy)`,
      ...(source.description !== undefined ? { description: source.description } : {}),
      ...(scope ? { scope } : {}),
      ...(ownerUserId != null ? { ownerUserId } : {}),
      // A copy starts disabled when the source moves money and the user has not confirmed — the
      // guard above already refused that case, so this is simply "copy the run policy too".
      enabled: source.enabled,
      priority: source.priority,
      definition: source.definition,
    });

    recordMoneyConfirmation(caller, money, 'duplicate', workflow.id);

    return toolSuccess({
      workflowId: workflow.id,
      sourceWorkflowId: source.id,
      workflow: summarizeWorkflow(workflow),
      note:
        'Runs, steps and mock samples were not copied. Add a payload with ' +
        'lab_workflow_mock_samples if the copy needs the same test data.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowDelete(params: {
  userId: number;
  workflowId: string;
  confirm: true;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  if (params.confirm !== true) {
    return toolError('Deleting a workflow requires `confirm: true`. Ask the user first.');
  }
  try {
    const existing = labWorkflowsService.getForCaller(caller, params.workflowId);
    if (!existing) {
      return toolError('NOT_FOUND: Workflow not found.', { code: 'NOT_FOUND' });
    }
    labWorkflowsService.deleteForCaller(caller, params.workflowId);
    return toolSuccess({
      workflowId: params.workflowId,
      deleted: true,
      note:
        'Runs, steps, mock samples, schedules and webhooks for this workflow were removed with it ' +
        '(ON DELETE CASCADE). Published versions are retained and are not reachable from the app.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

// ---------------------------------------------------------------------------------------------
// M2 — run and observe
// ---------------------------------------------------------------------------------------------

/**
 * Build the envelope a run should use.
 *
 * ## Why `items` becomes `payload.items`
 *
 * The trigger produces **one** item from the event payload — that is the item-array contract, and it
 * is what every workflow authored before W6 relies on. Treating a multi-record array as the run input
 * would silently change what `path` means halfway down a graph. So a single record is the payload
 * unchanged (the common case, and what an agent means by "run it with this object"), and multiple
 * records are nested under `items`, which is exactly the shape a Split Out node fans out.
 */
function buildEnvelopeForRun(
  workflow: LabWorkflowRecord,
  params: { payload?: Record<string, unknown>; items?: Record<string, unknown>[]; envelope?: Record<string, unknown> },
  caller: User,
): LabDomainEventEnvelopeV1 | undefined {
  if (params.envelope) {
    const parsed = LabDomainEventPublishSchema.safeParse(params.envelope);
    if (!parsed.success) {
      throw new LabWorkflowsError(
        'INVALID_INPUT',
        `envelope is not a valid event: ${parsed.error.issues
          .map((issue) => `${issue.path.join('.') || 'envelope'}: ${issue.message}`)
          .join('; ')}`,
      );
    }
    return parsed.data;
  }

  let payload = params.payload;
  if (params.items && params.items.length > 0) {
    payload =
      params.items.length === 1
        ? params.items[0]
        : { ...(params.payload ?? {}), items: params.items };
  }
  if (!payload) {
    return undefined;
  }

  const triggerEventType = getWorkflowTriggerEventType(workflow.definition);
  if (!triggerEventType) {
    throw new LabWorkflowsError(
      'INVALID_INPUT',
      'This workflow has no trigger node, so there is no event type to run with.',
    );
  }
  return {
    schemaVersion: 1,
    id: randomUUID(),
    type: triggerEventType,
    sourceAppId: 'platform-workflows',
    occurredAt: new Date().toISOString(),
    actorUserId: caller.userId,
    payload,
  };
}

/**
 * Persist the envelope before a **real** run.
 *
 * `lab_user_notifications.event_id` is a foreign key, so a run whose node notifies must have its
 * event row. Without it the notification fails per recipient, the run reports success and nobody is
 * told — the exact failure W8 recorded as decision #13 for the scheduler. An envelope that already
 * exists is fine: re-running the same payload is legitimate.
 */
async function persistEnvelopeForRealRun(envelope: LabDomainEventEnvelopeV1): Promise<void> {
  try {
    await labEventsRepository.publishEvent(
      envelope.id,
      envelope.type,
      envelope.sourceAppId,
      envelope.occurredAt,
      envelope.actorUserId ?? null,
      JSON.stringify(envelope.payload),
    );
  } catch {
    // Already recorded (a replay of a supplied envelope) — nothing to do.
  }
}

function shapeRunSteps(
  steps: { nodeId: string; nodeKind: string; status: string; itemsInCount: number; itemsOutCount: number; durationMs: number | null; detail: Record<string, unknown> | null; error: string | null }[],
  limit = LAB_WORKFLOW_MCP_MAX_ITEMS,
): { steps: unknown[]; omittedSteps: number } {
  const shown = steps.slice(0, limit).map((step) => ({
    nodeId: step.nodeId,
    nodeKind: step.nodeKind,
    status: step.status,
    itemsInCount: step.itemsInCount,
    itemsOutCount: step.itemsOutCount,
    durationMs: step.durationMs,
    detail: truncateStepDetail(step.detail),
    error: step.error,
  }));
  return { steps: shown, omittedSteps: Math.max(0, steps.length - shown.length) };
}

async function executeRun(
  params: LabWorkflowRunParams,
  dryRun: boolean,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const workflow = labWorkflowsService.getForCaller(caller, params.workflowId);
    if (!workflow) {
      return toolError('NOT_FOUND: Workflow not found.', { code: 'NOT_FOUND' });
    }

    const envelope =
      params.mockSampleId != null
        ? undefined
        : buildEnvelopeForRun(workflow, params, caller);

    if (!dryRun && envelope) {
      await persistEnvelopeForRealRun(envelope);
    }

    const result = await labWorkflowsService.runForCaller(caller, params.workflowId, {
      dryRun,
      ...(envelope ? { envelope } : {}),
      ...(params.mockSampleId ? { mockSampleId: params.mockSampleId } : {}),
      // An MCP run has no Fastify request, so `io` must be resolved from the live server. Without it
      // a `comms_system_dm_payload_user` step still writes the DM row and increments the unread badge,
      // but the socket fan-out is skipped: the thread stays empty until a page reload refetches
      // history. The run reports success either way, so the failure is invisible from the outside.
      io: ProviderService.getInstance().getSocketIOServer() ?? undefined,
    });

    const shaped = shapeRunSteps(result.steps);
    return toolSuccess({
      executionId: result.runId,
      dryRun: result.dryRun,
      status: result.status,
      ...(result.reason ? { reason: result.reason } : {}),
      ...shaped,
      issues: result.issues,
      note: result.dryRun
        ? 'Dry run: no run row was written and no notification, provider write or published event occurred.'
        : result.runId
          ? 'Real run recorded. Call lab_workflow_get_execution for the stored history.'
          : 'No run row was written (nothing executed).',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowRun(params: LabWorkflowRunParams): Promise<MCPToolResponse> {
  return executeRun(params, false);
}

export async function labWorkflowDryRun(params: LabWorkflowRunParams): Promise<MCPToolResponse> {
  return executeRun(params, true);
}

export async function labWorkflowMockSamples(
  params: LabWorkflowMockSamplesParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    if (params.action === 'list') {
      const samples = labWorkflowsService.listMockSamplesForCaller(caller, params.workflowId);
      return toolSuccess({
        samples: samples.map((sample) => shapeMockSample(sample)),
        count: samples.length,
      });
    }

    if (params.action === 'delete') {
      if (!params.sampleId) {
        return toolError('`sampleId` is required for action=delete.');
      }
      labWorkflowsService.deleteMockSampleForCaller(caller, params.workflowId, params.sampleId);
      return toolSuccess({ deleted: true, sampleId: params.sampleId });
    }

    // save
    if (!params.envelope) {
      return toolError(
        'Saving a sample requires a full `envelope`. Use lab_workflow_listen to capture a real one, ' +
          'or pass { schemaVersion: 1, id, type, sourceAppId, occurredAt, payload }.',
      );
    }
    if (!params.name) {
      return toolError('`name` is required for action=save — it is how the sample is chosen later.');
    }
    // The trigger node id is mandatory on the service (a sample attached to a non-trigger node would
    // never be offered in the picker), so resolve it from the workflow the caller has already been
    // authorised to read rather than making the agent dig it out of the graph.
    const workflow = labWorkflowsService.getForCaller(caller, params.workflowId);
    if (!workflow) {
      return toolError('NOT_FOUND: Workflow not found.', { code: 'NOT_FOUND' });
    }
    const triggerNodeId = params.triggerNodeId ?? firstTriggerNodeId(workflow.definition);
    if (!triggerNodeId) {
      return toolError(
        'INVALID_INPUT: This workflow has no trigger node, so a sample cannot be attached to it.',
      );
    }

    const sample = labWorkflowsService.createMockSampleForCaller(caller, params.workflowId, {
      triggerNodeId,
      name: params.name,
      envelope: params.envelope,
    });
    return toolSuccess({ sample: shapeMockSample(sample) });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

function firstTriggerNodeId(definition: LabWorkflowDefinition): string {
  if (!('nodes' in definition)) {
    return '';
  }
  return definition.nodes.find((node) => node.kind === 'trigger')?.id ?? '';
}

function shapeMockSample(sample: LabWorkflowMockSample): Record<string, unknown> {
  let envelope: unknown = null;
  try {
    envelope = truncateForMcp(JSON.parse(sample.envelopeJson) as unknown);
  } catch {
    envelope = { truncated: true, reason: 'unparseable_envelope' };
  }
  return {
    sampleId: sample.id,
    name: sample.name,
    triggerNodeId: sample.triggerNodeId,
    capturedAt: sample.capturedAt ?? null,
    createdAt: sample.createdAt,
    envelope,
  };
}

/**
 * Arm a workflow for the next real trigger (M2.4).
 *
 * ## Why this polls the mock-sample table rather than holding a subscription
 *
 * Capture is implemented in the publish pipeline, not as a subscription (W5c's design), and a
 * capture's durable record is the **mock sample it saves**. Waiting for that row is therefore the
 * honest signal: when the sample appears, the event arrived, and the payload the agent wanted is
 * already stored for replay. A socket or callback would be a second, parallel path that could
 * disagree with what the designer shows.
 *
 * The wait is capped so one tool call cannot consume a whole turn; the 5-minute TTL is the real
 * safety net, and the arm stays live after the tool returns, which is what makes "arm, then have the
 * user trigger the event" possible.
 */
export async function labWorkflowListen(
  params: LabWorkflowListenParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    if (params.action === 'status') {
      return toolSuccess({ listen: getListen(caller.userId, params.workflowId) });
    }
    if (params.action === 'disarm') {
      const wasArmed = disarmListen(caller.userId, params.workflowId);
      return toolSuccess({ armed: false, wasArmed });
    }

    const workflow = labWorkflowsService.getForCaller(caller, params.workflowId);
    if (!workflow) {
      return toolError('NOT_FOUND: Workflow not found.', { code: 'NOT_FOUND' });
    }
    const triggerEventType = getWorkflowTriggerEventType(workflow.definition);
    if (!triggerEventType) {
      return toolError('INVALID_INPUT: This workflow has no trigger node to listen on.');
    }

    const hooks = labWorkflowWebhooksRepository.listForWorkflow(params.workflowId);
    const before = new Set(
      labWorkflowsService
        .listMockSamplesForCaller(caller, params.workflowId)
        .map((sample) => sample.id),
    );

    const armed = armListen({
      workflowId: params.workflowId,
      userId: caller.userId,
      userRole: caller.role,
      triggerEventType,
      dryRun: params.dryRun !== false,
    });

    const waitMs = Math.min(
      params.waitMs ?? LAB_WORKFLOW_MCP_LISTEN_DEFAULT_WAIT_MS,
      LAB_WORKFLOW_MCP_LISTEN_MAX_WAIT_MS,
    );
    const capture = await waitForCapture(caller, params.workflowId, before, armed.expiresAt, waitMs);

    const capability = {
      triggerEventType,
      dryRun: armed.dryRun,
      expiresAt: new Date(armed.expiresAt).toISOString(),
      ttlMs: LAB_WORKFLOW_LISTEN_TTL_MS,
      // The webhook route evaluates directly rather than publishing to the bus, so the bus capture
      // never sees a delivery. It now satisfies arms itself (`captureWebhookDelivery`), so a webhook
      // trigger can be listened on like any other.
      webhookListeningSupported: true,
      hasWebhookHooks: hooks.length > 0,
    };

    if (!capture) {
      return toolSuccess({
        armed: true,
        captured: false,
        ...capability,
        note:
          'No matching event arrived within the wait. The arm is still live until `expiresAt` — have ' +
          'the user trigger the event, then call lab_workflow_listen with action=status, or list ' +
          'lab_workflow_mock_samples for a captured payload.',
      });
    }

    const runs = labWorkflowRunsRepository
      .listRunsForWorkflow(params.workflowId, 10)
      .filter((run) => run.mockSampleId === capture.id);
    return toolSuccess({
      armed: false,
      captured: true,
      ...capability,
      sample: shapeMockSample(capture),
      execution: runs[0]
        ? { executionId: runs[0].id, status: runs[0].status, startedAt: runs[0].startedAt }
        : null,
      note:
        'The arm was consumed by this capture. The payload is saved as a mock sample and can be ' +
        'replayed with lab_workflow_dry_run { mockSampleId }.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

async function waitForCapture(
  caller: User,
  workflowId: string,
  before: ReadonlySet<string>,
  expiresAt: number,
  waitMs: number,
): Promise<LabWorkflowMockSample | null> {
  const deadline = Math.min(Date.now() + waitMs, expiresAt);
  while (Date.now() < deadline) {
    // Arm was consumed (by a capture or by expiry); either way no new sample is coming.
    if (!getListen(caller.userId, workflowId)) {
      // Check once more before giving up: the capture deletes the arm before saving the sample in
      // some interleavings, so the sample may exist already.
      const captured = findNewCapture(caller, workflowId, before);
      return captured;
    }
    const captured = findNewCapture(caller, workflowId, before);
    if (captured) {
      return captured;
    }
    await new Promise((resolve) => setTimeout(resolve, LAB_WORKFLOW_MCP_LISTEN_POLL_MS));
  }
  return findNewCapture(caller, workflowId, before);
}

function findNewCapture(
  caller: User,
  workflowId: string,
  before: ReadonlySet<string>,
): LabWorkflowMockSample | null {
  try {
    return (
      labWorkflowsService
        .listMockSamplesForCaller(caller, workflowId)
        .find((sample) => !before.has(sample.id) && sample.capturedAt) ?? null
    );
  } catch {
    return null;
  }
}

export async function labWorkflowGetExecution(params: {
  userId: number;
  runId: string;
  stepLimit?: number;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const run = labWorkflowRunsRepository.getRun(params.runId);
    if (!run) {
      return toolError('NOT_FOUND: Run not found.', { code: 'NOT_FOUND' });
    }
    // Reading a run is reading the workflow it belongs to: scope is enforced there, so a member
    // cannot learn about a global workflow's execution by holding a run id.
    const workflow = labWorkflowsService.getForCaller(caller, run.workflowId);
    if (!workflow) {
      return toolError('NOT_FOUND: Run not found.', { code: 'NOT_FOUND' });
    }

    const steps = labWorkflowRunsRepository.listStepsForRun(run.id);
    const shaped = shapeRunSteps(steps, params.stepLimit ?? 50);
    let envelope: unknown = null;
    if (run.envelopeJson) {
      try {
        envelope = truncateForMcp(JSON.parse(run.envelopeJson) as unknown);
      } catch {
        envelope = { truncated: true, reason: 'unparseable_envelope' };
      }
    }

    return toolSuccess({
      executionId: run.id,
      workflowId: run.workflowId,
      workflowName: workflow.name,
      triggerType: run.triggerType,
      status: run.status,
      error: run.error,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      mockSampleId: run.mockSampleId,
      envelope,
      ...shaped,
      note:
        'A node that did not run has no step row — absence is the record of what was skipped. ' +
        '`itemsInCount`/`itemsOutCount` are counts; item JSON is not retained per step.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowListExecutions(params: {
  userId: number;
  workflowId?: string;
  status?: 'running' | 'succeeded' | 'partial' | 'failed' | 'skipped';
  limit?: number;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const limit = params.limit ?? 20;
    let runs = params.workflowId
      ? (() => {
          const workflow = labWorkflowsService.getForCaller(caller, params.workflowId);
          if (!workflow) {
            throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
          }
          return labWorkflowRunsRepository.listRunsForWorkflow(params.workflowId, limit * 3);
        })()
      : (() => {
          // No workflow filter: read a wider slice of the recent table, then keep only runs whose
          // workflow the caller may read. Filtering after the read is what stops the tool from
          // leaking another user's run ids.
          const readable = new Set(
            labWorkflowsService.listForCaller(caller).map((workflow) => workflow.id),
          );
          return labWorkflowRunsRepository
            .listRecentRuns(Math.min(limit * 8, 400))
            .filter((run) => readable.has(run.workflowId));
        })();

    if (params.status) {
      runs = runs.filter((run) => run.status === params.status);
    }
    runs = runs.slice(0, limit);

    return toolSuccess({
      executions: runs.map((run) => ({
        executionId: run.id,
        workflowId: run.workflowId,
        triggerType: run.triggerType,
        status: run.status,
        error: run.error,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        mockSampleId: run.mockSampleId,
      })),
      count: runs.length,
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

// ---------------------------------------------------------------------------------------------
// M3 — governance
// ---------------------------------------------------------------------------------------------

async function setEnabled(
  userId: number,
  workflowId: string,
  enabled: boolean,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const workflow = labWorkflowsService.updateForCaller(caller, workflowId, { enabled });
    return toolSuccess({
      workflowId: workflow.id,
      enabled: workflow.enabled,
      note: enabled
        ? 'Enabled workflows run on every matching event. Enabling is subject to per-scope limits.'
        : 'Disabled workflows do not react to events, but can still be run on demand and dry-run.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowEnable(params: {
  userId: number;
  workflowId: string;
}): Promise<MCPToolResponse> {
  return setEnabled(params.userId, params.workflowId, true);
}

export async function labWorkflowDisable(params: {
  userId: number;
  workflowId: string;
}): Promise<MCPToolResponse> {
  return setEnabled(params.userId, params.workflowId, false);
}

export async function labWorkflowGetFailures(params: {
  userId: number;
  workflowId?: string;
  limit?: number;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const limit = params.limit ?? 20;
    const failures = labWorkflowRunsRepository
      .listRecentRuns(Math.min(limit * 8, 400))
      .filter((run) => run.status === 'failed')
      .filter((run) => (params.workflowId ? run.workflowId === params.workflowId : true));

    // Scope is applied by resolving each workflow through the service, so an admin sees all failures
    // and a member sees only their own. A run whose workflow is no longer readable is omitted.
    const visible: Record<string, unknown>[] = [];
    for (const run of failures) {
      const workflow = labWorkflowsService.getForCaller(caller, run.workflowId);
      if (!workflow) {
        continue;
      }
      const steps = labWorkflowRunsRepository.listStepsForRun(run.id);
      const failedStep = steps.find((step) => step.status === 'failed');
      visible.push({
        executionId: run.id,
        workflowId: run.workflowId,
        workflowName: workflow.name,
        triggerType: run.triggerType,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        error: run.error,
        failedNode: failedStep
          ? {
              nodeId: failedStep.nodeId,
              nodeKind: failedStep.nodeKind,
              error: failedStep.error,
              detail: truncateStepDetail(failedStep.detail),
            }
          : null,
      });
      if (visible.length >= limit) {
        break;
      }
    }

    return toolSuccess({
      failures: visible,
      count: visible.length,
      note:
        'A failing workflow also publishes `platform-workflows.run.failed`, so an error-triggered ' +
        'workflow can respond to these without polling.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowListVersions(params: {
  userId: number;
  workflowId: string;
}): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const versions = labWorkflowsService.listVersionsForCaller(caller, params.workflowId);
    return toolSuccess({
      versions: versions.map((version) => ({
        versionId: version.id,
        version: version.version,
        name: version.name,
        note: version.note,
        publishedByUserId: version.publishedByUserId,
        createdAt: version.createdAt,
      })),
      count: versions.length,
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

export async function labWorkflowPublishVersion(
  params: LabWorkflowPublishVersionParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    if (params.action === 'publish') {
      const result = labWorkflowsService.publishForCaller(caller, params.workflowId, {
        ...(params.note !== undefined ? { note: params.note } : {}),
      });
      return toolSuccess({
        action: 'publish',
        versionId: result.id,
        version: result.version,
        note:
          'Publishing snapshots the current graph so it can be restored. It is separate from saving: ' +
          'saving changes what runs next, publishing records the shape you keep.',
      });
    }

    if (!params.versionId) {
      return toolError('`versionId` is required for action=rollback.');
    }
    const workflow = labWorkflowsService.rollbackForCaller(
      caller,
      params.workflowId,
      params.versionId,
    );
    return toolSuccess({
      action: 'rollback',
      versionId: params.versionId,
      workflow: summarizeWorkflow(workflow),
      note:
        'The snapshot was re-validated before restoring. Versions published after it are retained, ' +
        'so you can roll forward again.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}

/**
 * Set or clear a trigger's schedule (34.16).
 *
 * Goes through the **service**, which edits the graph and reconciles the schedule row — the same path
 * the designer uses. A handler that wrote `lab_workflow_schedules` directly would produce a row the
 * designer could not show or remove, which is exactly the invisible-state bug this phase removes.
 *
 * The response reports the computed `nextFireAt` so the agent can confirm the pattern was understood
 * without a second read, and passes through any `computeNextFireAt` warnings.
 */
export async function labWorkflowSetSchedule(
  params: LabWorkflowSetScheduleParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    if (params.schedule != null && params.schedule.kind !== 'interval') {
      if (!params.schedule.expression?.trim()) {
        return toolError('INVALID_INPUT: a cron or recurrence schedule needs `expression`.', {
          hint:
            params.schedule.kind === 'cron'
              ? 'Use exactly 5 fields: minute hour day-of-month month day-of-week, e.g. "0 9 * * 1-5".'
              : 'Use an RRULE body, e.g. "FREQ=WEEKLY;BYDAY=MO".',
        });
      }
    }
    if (
      params.schedule != null &&
      params.schedule.kind === 'interval' &&
      !params.schedule.intervalMinutes
    ) {
      return toolError('INVALID_INPUT: an interval schedule needs `intervalMinutes`.', {
        hint: 'The platform floor is 60 seconds per workflow.',
      });
    }

    const result = labWorkflowsService.setScheduleForCaller(caller, params.workflowId, {
      triggerNodeId: params.triggerNodeId,
      schedule: params.schedule,
    });

    return toolSuccess({
      workflowId: params.workflowId,
      cleared: params.schedule == null,
      schedules: result.schedules.map((row) => ({
        scheduleId: row.id,
        triggerNodeId: row.triggerNodeId,
        kind: row.kind,
        expression: row.expression,
        timezone: row.timezone,
        intervalMinutes: row.intervalMinutes,
        nextFireAt: row.nextFireAt,
        lastFiredAt: row.lastFiredAt,
        enabled: row.enabled,
      })),
      warnings: result.warnings,
      note:
        params.schedule == null
          ? 'The schedule row was deleted. The workflow no longer fires on the clock; its event trigger is unchanged.'
          : 'The schedule was written to the graph and its row reconciled. nextFireAt is computed at save, so the first fire is not a tick late.',
    });
  } catch (err) {
    return mapWorkflowError(err);
  }
}
