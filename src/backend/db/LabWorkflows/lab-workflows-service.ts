import { DateTime } from 'luxon';
import { labWorkflowsRepository } from './lab-workflows-repository';
import {
  labWorkflowVersionsRepository,
  type LabWorkflowVersionRecord,
} from './lab-workflow-versions-repository';
import type { LabWorkflowRecord, LabWorkflowScope } from '@/shared/types/lab-workflow';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabWorkflowManualRunResult } from '@/shared/types/lab-workflow-run';
import { LabDomainEventPublishSchema } from '@/shared/types/schemas/lab-domain-event-schema';
import { LAB_WORKFLOW_MOCK_SAMPLE_MAX_BYTES } from '@/shared/types/lab-workflow-mock-sample';
import type { Server as SocketIOServer } from 'socket.io';
import {
  parseLabWorkflowCreate,
  parseLabWorkflowDefinition,
  parseLabWorkflowUpdate,
} from '@/shared/types/schemas/lab-workflow-schema';
import { eventTypeMatches } from '../../lab-rules/lab-rules-match';
import { workflowConditionsMatch } from '../../lab-workflows/lab-workflow-integration-runtime';
import type { User } from '@/shared/types/user';
import {
  getWorkflowTopLevelConditions,
  getWorkflowTriggerEventType,
  isLabWorkflowDefinitionV2,
} from '@/shared/utils/lab-workflow-definition';
import { dedupeLabWorkflowGraphEdges } from '@/shared/utils/lab-workflow-graph-edge';
import { validateWorkflowDefinition } from '@/shared/utils/validate-lab-workflow-definition';
import { labEventsRepository } from '../LabEvents/lab-events-repository';
import { loadDeclaredDomainEventCatalogEntries } from '@/backend/lab-events/declared-domain-event-catalog';
import { labWorkflowRunsRepository } from './lab-workflow-runs-repository';
import type { LabWorkflowRun, LabWorkflowRunStep } from '@/shared/types/lab-workflow-run';
import { labWorkflowMockSamplesRepository } from './lab-workflow-mock-samples-repository';
import { labWorkflowSchedulesRepository } from './lab-workflow-schedules-repository';
import { computeNextFireAt } from '@/shared/utils/lab-workflow-schedule-time';
import type { LabWorkflowSchedule } from '@/shared/types/lab-workflow-schedule';
import type {
  LabWorkflowDefinitionV2,
  LabWorkflowTriggerScheduleV1,
} from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowMockSample } from '@/shared/types/lab-workflow-mock-sample';
import {
  beginWorkflowRun,
  classifyStepStatus,
  createCapturedRunHandle,
} from '../../lab-workflows/lab-workflow-run-recorder';
import { evaluateWorkflowGraphForDomainEvent } from '../../lab-workflows/lab-workflow-graph-evaluator';
import { runWorkflowStep } from '../../lab-workflows/lab-workflow-step-runner';
import { singleItemOutput, type LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import { randomUUID } from 'node:crypto';
import { persistRunSuspension } from '@/backend/lab-workflows/lab-workflow-resume-service';
import { LabEventsService } from '../LabEvents/lab-events-service';
import type {
  LabWorkflowPrepareAppsResult,
  LabWorkflowRequiredAppsSummary,
} from '@/shared/types/lab-workflow-required-apps';
import {
  prepareWorkflowRequiredApps,
  summarizeWorkflowRequiredApps,
} from '../../lab-workflows/lab-workflow-required-apps-runtime';
import { VSCodeLogger } from '../../utils/logger';

export interface ListWorkflowsQuery {
  scope?: LabWorkflowScope;
  ownerUserId?: number;
}

const MAX_ENABLED_GLOBAL = 30;
const MAX_ENABLED_PER_USER = 15;

interface ParsedMockSampleInput {
  triggerNodeId: string;
  name: string;
  envelope: LabDomainEventEnvelopeV1;
}

/**
 * Validate a saved-mock body (W5b).
 *
 * The envelope is parsed with the same schema the publish endpoint uses, not a looser one: a sample
 * that could be saved but never replayed would be a trap, and a mock is only useful if it is
 * indistinguishable from the real thing it stands in for.
 */
function parseMockSampleInput(body: unknown): ParsedMockSampleInput {
  if (typeof body !== 'object' || body == null) {
    throw new LabWorkflowsError('INVALID_INPUT', 'Expected a mock payload body');
  }
  const raw = body as Record<string, unknown>;
  const triggerNodeId = typeof raw.triggerNodeId === 'string' ? raw.triggerNodeId.trim() : '';
  if (!triggerNodeId) {
    throw new LabWorkflowsError('INVALID_INPUT', 'triggerNodeId is required');
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) {
    throw new LabWorkflowsError('INVALID_INPUT', 'A name is required so the sample can be reused');
  }
  if (name.length > 120) {
    throw new LabWorkflowsError('INVALID_INPUT', 'Name is too long (max 120 characters)');
  }

  const parsedEnvelope = LabDomainEventPublishSchema.safeParse(raw.envelope);
  if (!parsedEnvelope.success) {
    throw new LabWorkflowsError(
      'INVALID_INPUT',
      `Mock payload is not a valid event envelope: ${parsedEnvelope.error.issues
        .map((issue) => `${issue.path.join('.') || 'envelope'}: ${issue.message}`)
        .join('; ')}`,
    );
  }

  const envelopeJson = JSON.stringify(parsedEnvelope.data);
  if (envelopeJson.length > LAB_WORKFLOW_MOCK_SAMPLE_MAX_BYTES) {
    throw new LabWorkflowsError(
      'INVALID_INPUT',
      `Mock payload is too large (max ${LAB_WORKFLOW_MOCK_SAMPLE_MAX_BYTES} bytes)`,
    );
  }

  return { triggerNodeId, name, envelope: parsedEnvelope.data };
}

export function isPlatformWorkflowsAdmin(user: User): boolean {
  return user.role === 'owner' || user.role === 'admin';
}

export interface ScheduleSyncWarning {
  triggerNodeId: string;
  warnings: string[];
}

export interface ScheduleSyncResult {
  /** The schedules that exist after reconcile, with their freshly computed runtime state. */
  schedules: LabWorkflowSchedule[];
  /** Non-fatal problems from `computeNextFireAt`, surfaced in the save response. */
  warnings: ScheduleSyncWarning[];
}

/** Stable identity for an authored pattern, so reconcile can tell an edit from a no-op. */
function schedulePatternKey(schedule: LabWorkflowTriggerScheduleV1): string {
  return [
    schedule.kind,
    schedule.kind === 'interval' ? '' : (schedule.expression ?? '').trim(),
    schedule.timezone.trim(),
    schedule.kind === 'interval' ? String(schedule.intervalMinutes ?? '') : '',
  ].join('|');
}

function collectWorkflowStepsPreview(
  definition: LabWorkflowRecord['definition'],
): LabWorkflowStepV1[] {
  if (isLabWorkflowDefinitionV2(definition)) {
    return definition.nodes
      .filter((node): node is Extract<typeof node, { kind: 'action' }> => node.kind === 'action')
      .map((node) => node.step);
  }
  return definition.steps;
}

export class LabWorkflowsService {
  private static instance: LabWorkflowsService | null = null;

  private constructor() {}

  static getInstance(): LabWorkflowsService {
    if (!LabWorkflowsService.instance) {
      LabWorkflowsService.instance = new LabWorkflowsService();
    }
    return LabWorkflowsService.instance;
  }

  listForCaller(caller: User, query?: ListWorkflowsQuery): LabWorkflowRecord[] {
    if (caller.role === 'viewer') {
      return [];
    }
    const all = labWorkflowsRepository.listAll();
    if (isPlatformWorkflowsAdmin(caller)) {
      return all.filter((workflow) => {
        if (query?.scope && workflow.scope !== query.scope) {
          return false;
        }
        if (query?.ownerUserId != null && workflow.ownerUserId !== query.ownerUserId) {
          return false;
        }
        return true;
      });
    }
    return all.filter(
      (workflow) => workflow.scope === 'user' && workflow.ownerUserId === caller.userId,
    );
  }

  /**
   * Read one workflow, reconciling its schedule rows first (34.5).
   *
   * The reconcile is deliberately on **read** as well as write. A graph can reach the database through
   * another path (an import, a direct seed, a build that predates this feature), and a schedule that
   * exists only in the graph is a row the tick cannot see — the workflow would look scheduled in the
   * editor and never fire. Reconciling here means the first person to look at it fixes it.
   */
  getForCaller(caller: User, workflowId: string): LabWorkflowRecord | null {
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      return null;
    }
    this.assertCanReadWorkflow(caller, workflow);
    this.syncSchedulesForWorkflow(workflow);
    return workflow;
  }

  /** Effective schedules for a workflow, with the runtime state the editor shows. */
  listSchedulesForCaller(caller: User, workflowId: string): LabWorkflowSchedule[] {
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, workflow);
    return this.syncSchedulesForWorkflow(workflow).schedules;
  }

  /**
   * Set or clear a schedule on one trigger node (34.16).
   *
   * Implemented as a **graph edit plus save**, not a separate table write. That is the whole point of
   * the phase: one source of truth, therefore one validation path. A tool that wrote the row directly
   * would produce a stored schedule the designer could neither show nor remove.
   *
   * `schedule: null` clears it; the reconcile on save deletes the row.
   */
  setScheduleForCaller(
    caller: User,
    workflowId: string,
    params: { triggerNodeId?: string; schedule: LabWorkflowTriggerScheduleV1 | null },
  ): {
    workflow: LabWorkflowRecord;
    schedules: LabWorkflowSchedule[];
    warnings: ScheduleSyncWarning[];
  } {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot schedule workflows');
    }
    const existing = labWorkflowsRepository.getById(workflowId);
    if (!existing) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, existing);

    if (!isLabWorkflowDefinitionV2(existing.definition)) {
      throw new LabWorkflowsError(
        'INVALID_INPUT',
        'This workflow uses the legacy v1 format, which has no trigger node to schedule. Open it in the designer once to migrate it.',
      );
    }

    const triggers = existing.definition.nodes.filter((node) => node.kind === 'trigger');
    if (triggers.length === 0) {
      throw new LabWorkflowsError('INVALID_INPUT', 'This workflow has no trigger node.');
    }
    const requestedId = params.triggerNodeId?.trim();
    const target = requestedId
      ? triggers.find((node) => node.id === requestedId)
      : triggers.length === 1
        ? triggers[0]
        : undefined;
    if (!target) {
      throw new LabWorkflowsError(
        'INVALID_INPUT',
        requestedId
          ? 'triggerNodeId does not name a trigger node of this workflow.'
          : 'This workflow has more than one trigger node; pass triggerNodeId.',
      );
    }

    const definition: LabWorkflowDefinitionV2 = {
      ...existing.definition,
      nodes: existing.definition.nodes.map((node) => {
        if (node.id !== target.id || node.kind !== 'trigger') {
          return node;
        }
        if (params.schedule == null) {
          // Explicit delete rather than an unused destructure: the lint rule is right that an
          // underscore-prefixed binding is still dead code.
          const cleared = { ...node };
          delete (cleared as { schedule?: unknown }).schedule;
          return cleared;
        }
        return {
          ...node,
          schedule: {
            ...params.schedule,
            timezone: params.schedule.timezone.trim(),
            expression:
              params.schedule.kind === 'interval'
                ? undefined
                : (params.schedule.expression ?? '').trim(),
            intervalMinutes:
              params.schedule.kind === 'interval' ? params.schedule.intervalMinutes : undefined,
          },
        };
      }),
    };

    // Reuse the save validator so an MCP-authored schedule is checked exactly like a designer save.
    this.assertDefinitionValid(definition);
    const next: LabWorkflowRecord = { ...existing, definition, updatedAt: new Date().toISOString() };
    labWorkflowsRepository.updateWorkflow(next);
    const sync = this.syncSchedulesForWorkflow(next);
    return { workflow: next, schedules: sync.schedules, warnings: sync.warnings };
  }

  createForCaller(caller: User, body: unknown): LabWorkflowRecord {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot manage workflows');
    }
    const bodyRecord =
      typeof body === 'object' && body != null ? { ...(body as Record<string, unknown>) } : {};
    if (!isPlatformWorkflowsAdmin(caller)) {
      bodyRecord.scope = 'user';
      bodyRecord.ownerUserId = caller.userId;
    }
    const parsed = parseLabWorkflowCreate(bodyRecord);
    let scope = parsed.scope;
    let ownerUserId: number | null = parsed.ownerUserId ?? null;

    if (!isPlatformWorkflowsAdmin(caller)) {
      scope = 'user';
      ownerUserId = caller.userId;
    } else if (scope === 'user' && ownerUserId == null) {
      throw new LabWorkflowsError('INVALID_INPUT', 'User-scoped workflows require ownerUserId');
    } else if (scope === 'global') {
      ownerUserId = null;
    }

    if (parsed.enabled) {
      this.assertEnableLimits(scope, ownerUserId);
    }

    const definition = this.withoutDuplicateEdges(parseLabWorkflowDefinition(parsed.definition));
    this.assertDefinitionValid(definition);
    const record: LabWorkflowRecord = {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      tags: parsed.tags ?? [],
      scope,
      ownerUserId,
      createdByUserId: caller.userId,
      enabled: parsed.enabled,
      priority: parsed.priority,
      definition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    labWorkflowsRepository.insertWorkflow({
      id: record.id,
      name: record.name,
      description: record.description ?? null,
      scope: record.scope,
      ownerUserId: record.ownerUserId,
      createdByUserId: record.createdByUserId,
      enabled: record.enabled,
      priority: record.priority,
      tagsJson: JSON.stringify(record.tags ?? []),
      definitionJson: JSON.stringify(record.definition),
    });

    // Reconcile immediately so the first fire is not one tick late (34.4).
    this.syncSchedulesForWorkflow(record);

    return record;
  }

  updateForCaller(caller: User, workflowId: string, body: unknown): LabWorkflowRecord {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot manage workflows');
    }
    const existing = labWorkflowsRepository.getById(workflowId);
    if (!existing) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, existing);

    const parsed = parseLabWorkflowUpdate(body);
    const adminPatch = body as { scope?: LabWorkflowScope; ownerUserId?: number };

    const nextDefinition = this.withoutDuplicateEdges(
      parsed.definition ? parseLabWorkflowDefinition(parsed.definition) : existing.definition,
    );
    this.assertDefinitionValid(nextDefinition);

    const next: LabWorkflowRecord = {
      ...existing,
      name: parsed.name ?? existing.name,
      description: parsed.description ?? existing.description,
      tags: parsed.tags ?? existing.tags ?? [],
      enabled: parsed.enabled ?? existing.enabled,
      priority: parsed.priority ?? existing.priority,
      definition: nextDefinition,
      updatedAt: new Date().toISOString(),
    };

    if (isPlatformWorkflowsAdmin(caller)) {
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

    labWorkflowsRepository.updateWorkflow(next);
    // Always reconcile: removing a schedule from the graph must delete its live row, or the workflow
    // keeps firing a pattern nobody can see (34.3).
    this.syncSchedulesForWorkflow(next);
    if (next.enabled && !existing.enabled) {
      void this.warmRequiredAppsOnEnable(next, caller.userId);
    }
    return next;
  }

  private workflowCatalogEntries() {
    return LabEventsService.getInstance().getEventCatalog().entries;
  }

  private warmRequiredAppsOnEnable(workflow: LabWorkflowRecord, userId: number): void {
    void prepareWorkflowRequiredApps(workflow.definition, this.workflowCatalogEntries(), userId)
      .then((result) => {
        if (!result.allLaunchableReady) {
          void VSCodeLogger.getInstance().then((logger) =>
            logger.warn(
              `[lab-workflows] enable warm-up incomplete workflow=${workflow.id} ${result.message ?? ''}`,
            ),
          );
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        void VSCodeLogger.getInstance().then((logger) =>
          logger.warn(`[lab-workflows] enable warm-up failed workflow=${workflow.id}: ${message}`),
        );
      });
  }

  async getRequiredAppsForCaller(
    caller: User,
    workflowId: string,
  ): Promise<LabWorkflowRequiredAppsSummary> {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot inspect workflows');
    }
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, workflow);
    return summarizeWorkflowRequiredApps(workflow.definition, this.workflowCatalogEntries());
  }

  async prepareRequiredAppsForCaller(
    caller: User,
    workflowId: string,
  ): Promise<LabWorkflowPrepareAppsResult> {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot prepare workflow apps');
    }
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, workflow);
    return prepareWorkflowRequiredApps(
      workflow.definition,
      this.workflowCatalogEntries(),
      caller.userId,
    );
  }

  /**
   * Snapshot the current definition as a published version (W11).
   *
   * Publication is a distinct act from saving. Saving changes what will run on the next event;
   * publishing records "this is the shape I have decided to keep", which is what makes a rollback
   * target meaningful. Conflating them would produce a version history that is really an edit history.
   */
  publishForCaller(
    caller: User,
    workflowId: string,
    body: unknown,
  ): { version: number; id: string } {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot publish workflows');
    }
    const existing = labWorkflowsRepository.getById(workflowId);
    if (!existing) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, existing);
    // Publishing an invalid graph would create a snapshot that cannot be restored, which is worse
    // than refusing to publish.
    this.assertDefinitionValid(existing.definition);

    const note = (body as { note?: unknown } | null)?.note;
    const id = randomUUID();
    const version = labWorkflowVersionsRepository.publish({
      id,
      workflowId,
      name: existing.name,
      description: existing.description ?? null,
      definitionJson: JSON.stringify(existing.definition),
      publishedByUserId: caller.userId,
      note: typeof note === 'string' ? note.slice(0, 500) : null,
    });
    return { version, id };
  }

  listVersionsForCaller(caller: User, workflowId: string): LabWorkflowVersionRecord[] {
    const existing = labWorkflowsRepository.getById(workflowId);
    if (!existing) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, existing);
    return labWorkflowVersionsRepository.listForWorkflow(workflowId);
  }

  /**
   * Restore a published snapshot.
   *
   * The snapshot is re-validated before it is written. That is not ceremony: a version published
   * before a validator rule existed can be invalid under today's rules, and silently restoring it
   * would make an unrunnable workflow the live one — the failure a user would notice only when nothing
   * fired.
   */
  rollbackForCaller(
    caller: User,
    workflowId: string,
    versionId: string,
  ): LabWorkflowRecord {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot roll workflows back');
    }
    const existing = labWorkflowsRepository.getById(workflowId);
    if (!existing) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, existing);

    const version = labWorkflowVersionsRepository.findById(workflowId, versionId);
    if (!version) {
      throw new LabWorkflowsError('NOT_FOUND', 'Version not found');
    }

    const definition = this.withoutDuplicateEdges(
      parseLabWorkflowDefinition(JSON.parse(version.definitionJson) as unknown),
    );
    this.assertDefinitionValid(definition);

    const next: LabWorkflowRecord = {
      ...existing,
      name: version.name,
      description: version.description ?? undefined,
      definition,
      updatedAt: new Date().toISOString(),
    };
    labWorkflowsRepository.updateWorkflow(next);
    this.syncSchedulesForWorkflow(next);
    return next;
  }

  deleteForCaller(caller: User, workflowId: string): void {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot manage workflows');
    }
    const existing = labWorkflowsRepository.getById(workflowId);
    if (!existing) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, existing);
    labWorkflowsRepository.deleteWorkflow(workflowId);
  }

  /**
   * Run, or preview, one workflow on demand (W5a).
   *
   * This is the capability that decides whether a business user can author here at all: without it
   * the only way to test a graph is to enable it in production and wait for a real event.
   *
   * ## Why `dryRun` is a separate argument and not "run and roll back"
   *
   * There is nothing to roll back. A notification already reached a Socket.IO client, a provider
   * app already wrote a row, a published event is already on the bus. The only safe preview is one
   * where the side-effecting branches never take the call — which is why the flag is threaded into
   * every node.
   *
   * ## Why a manual run is allowed on a disabled workflow
   *
   * `workflowMatchesEvent` refuses a disabled workflow, and it is right to for events. But a manual
   * run is explicitly the author saying "run this now" — refusing it would mean enabling a workflow
   * to test it, which is the exact production risk this phase removes.
   */
  async runForCaller(
    caller: User,
    workflowId: string,
    options: {
      dryRun: boolean;
      envelope?: LabDomainEventEnvelopeV1;
      /** Replay a saved sample (W5b). Recorded on the run so history can tell it apart. */
      mockSampleId?: string | null;
      /** Start catalog app servers this graph needs (preview lookups and real runs). */
      prepareApps?: boolean;
      io?: SocketIOServer;
    },
  ): Promise<LabWorkflowManualRunResult> {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot run workflows');
    }
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, workflow);

    const observed = labEventsRepository.listDistinctEventTypes(200);
    const validation = isLabWorkflowDefinitionV2(workflow.definition)
      ? validateWorkflowDefinition(workflow.definition, {
          observedEventTypes: observed,
          declaredCatalogEntries: loadDeclaredDomainEventCatalogEntries(),
        })
      : { errors: [], warnings: [] };
    const issues = [...validation.errors, ...validation.warnings].map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      targetId: issue.targetId,
      message: issue.message,
    }));

    // A saved sample wins over a supplied envelope: the sample *is* the payload, and letting both
    // apply would mean the panel and the history could disagree about what was replayed.
    const triggerEventType = getWorkflowTriggerEventType(workflow.definition);
    let mockSampleId: string | null = null;
    let suppliedEnvelope = options.envelope;
    if (options.mockSampleId) {
      const sample = labWorkflowMockSamplesRepository.getById(workflowId, options.mockSampleId);
      if (!sample) {
        throw new LabWorkflowsError('NOT_FOUND', 'Mock sample not found');
      }
      suppliedEnvelope = JSON.parse(sample.envelopeJson) as LabDomainEventEnvelopeV1;
      mockSampleId = sample.id;
    }

    // Otherwise a synthesised envelope, so pressing Run does not require the author to hand-write
    // a JSON payload first.
    const envelope: LabDomainEventEnvelopeV1 = suppliedEnvelope ?? {
      schemaVersion: 1,
      id: randomUUID(),
      type: triggerEventType ?? 'workflow.manual.run',
      sourceAppId: 'platform-workflows',
      occurredAt: new Date().toISOString(),
      actorUserId: caller.userId,
      payload: {},
    };

    if (!triggerEventType) {
      return {
        runId: null,
        dryRun: options.dryRun,
        status: 'skipped',
        steps: [],
        issues,
        reason: 'This workflow has no trigger node.',
      };
    }

    if (!eventTypeMatches(triggerEventType, envelope.type)) {
      // A manual run is a test of *this* graph, so a mismatched envelope is a user error worth
      // reporting rather than silently doing nothing.
      return {
        runId: null,
        dryRun: options.dryRun,
        status: 'skipped',
        steps: [],
        issues,
        reason: `The supplied event type "${envelope.type}" does not match the trigger "${triggerEventType}".`,
      };
    }

    const shouldPrepareApps = options.prepareApps === true || options.dryRun === false;
    if (shouldPrepareApps) {
      const prepared = await prepareWorkflowRequiredApps(
        workflow.definition,
        this.workflowCatalogEntries(),
        caller.userId,
      );
      if (!options.dryRun && !prepared.allLaunchableReady) {
        return {
          runId: null,
          dryRun: options.dryRun,
          status: 'skipped',
          steps: [],
          issues,
          reason:
            prepared.message ??
            'One or more apps this workflow needs are not running. Start them below, then try again.',
        };
      }
    }

    const captured = options.dryRun ? createCapturedRunHandle(workflow.id) : null;
    const run = captured
      ? captured.handle
      : beginWorkflowRun({
          workflowId: workflow.id,
          triggerType: 'manual',
          envelope,
          mockSampleId,
        });

    const runOptions = {
      io: options.io,
      run,
      dryRun: options.dryRun,
      // Only a manual designer run has a canvas watching, so only this path streams.
      streamUserId: caller.userId,
      streamWorkflowId: workflow.id,
      // A suspended `wait` in a preview is not persisted: a preview has no run row and nothing
      // should be resumable from it.
      onSuspend: options.dryRun
        ? undefined
        : (suspend: { nodeId: string; items: readonly LabWorkflowItem[]; resumeAt: string }) => {
            void persistRunSuspension({
              runId: run.id,
              workflowId: workflow.id,
              nodeId: suspend.nodeId,
              items: suspend.items,
              resumeAt: suspend.resumeAt,
            });
          },
    };

    try {
      if (isLabWorkflowDefinitionV2(workflow.definition)) {
        await evaluateWorkflowGraphForDomainEvent(
          workflow.definition,
          envelope,
          workflow.name,
          workflow.scope,
          workflow.ownerUserId,
          runOptions,
        );
      } else {
        // V1 definitions have no graph; run their steps in order. Items thread step to step, so a
        // later step can read a field an earlier one wrote — the same contract the graph evaluator
        // honours for v2.
        let stepItems: readonly LabWorkflowItem[] = singleItemOutput(envelope.payload, 'trigger').items;
        for (const [index, step] of workflow.definition.steps.entries()) {
          const stepOutcome = await runWorkflowStep({
            step,
            envelope,
            items: stepItems,
            workflowName: workflow.name,
            nodeId: `step-${index + 1}`,
            options: runOptions,
          });
          run.recordStep({
            nodeId: `step-${index + 1}`,
            nodeKind: step.kind,
            status: stepOutcome.kind === 'abort' ? classifyStepStatus(stepOutcome.reason) : 'succeeded',
            itemsInCount: stepItems.length,
            itemsOutCount: stepOutcome.kind === 'continue' ? stepOutcome.output.items.length : 0,
            detail: stepOutcome.kind === 'continue' ? stepOutcome.detail ?? null : null,
            error: stepOutcome.kind === 'abort' ? stepOutcome.reason : null,
          });
          if (stepOutcome.kind === 'abort') {
            break;
          }
          stepItems = stepOutcome.output.items;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'workflow run threw';
      if (run.id) {
        run.finish('failed', message);
      } else {
        run.finish('failed');
      }
      return {
        runId: run.id || null,
        dryRun: options.dryRun,
        status: 'failed',
        steps: captured?.captured.steps ?? [],
        issues,
        reason: message,
      };
    }

    run.finish();

    if (captured) {
      return {
        runId: null,
        dryRun: true,
        status: captured.captured.status ?? 'succeeded',
        steps: captured.captured.steps,
        issues,
      };
    }

    const stored = labWorkflowRunsRepository.getRun(run.id);
    return {
      runId: run.id,
      dryRun: false,
      status: stored?.status ?? 'succeeded',
      steps: labWorkflowRunsRepository.listStepsForRun(run.id).map((row) => ({
        nodeId: row.nodeId,
        nodeKind: row.nodeKind,
        status: row.status,
        itemsInCount: row.itemsInCount,
        itemsOutCount: row.itemsOutCount,
        durationMs: row.durationMs,
        detail: row.detail,
        error: row.error,
      })),
      issues,
    };
  }

  /**
   * Execution history for a workflow, newest first (Logs tab).
   *
   * ## Why manual and live runs are listed separately
   *
   * A designer "Test" run is a manual run and a real trigger is not, so `triggerType` already
   * distinguishes them — but the useful split is not "who pressed go", it is **would this have fired
   * on its own**. A webhook/schedule/event run is production evidence; a manual run is a rehearsal
   * the author invoked deliberately (and, in dry-run form, leaves no row at all — see
   * `runForCaller`, which returns `runId: null` for a preview).
   *
   * Filtering server-side rather than in the panel keeps the retention window honest: the newest 200
   * rows per workflow are shared between both lists, so a panel that filtered client-side could show
   * an empty Live list while 200 manual runs sat in the table, which reads as "never fired".
   *
   * Read access follows the workflow, exactly like mock samples: seeing that a workflow fired is not a
   * write, so a viewer may read it.
   */
  listRunsForCaller(
    caller: User,
    workflowId: string,
    options: { kind?: 'manual' | 'live'; limit?: number } = {},
  ): LabWorkflowRun[] {
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, workflow);
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const runs = labWorkflowRunsRepository.listRunsForWorkflow(workflowId, limit);
    if (!options.kind) {
      return runs;
    }
    const wantManual = options.kind === 'manual';
    return runs.filter((run) => (run.triggerType === 'manual') === wantManual);
  }

  /**
   * One run with its steps, for the details modal.
   *
   * The workflow is re-read and access-checked here rather than trusting a `runId` alone: a run id is
   * not a capability. Without the ownership check, any authenticated user who guessed or observed an
   * id could read another user's private workflow history.
   */
  getRunForCaller(
    caller: User,
    workflowId: string,
    runId: string,
  ): { run: LabWorkflowRun; steps: LabWorkflowRunStep[] } {
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, workflow);
    const run = labWorkflowRunsRepository.getRun(runId);
    if (!run || run.workflowId !== workflowId) {
      throw new LabWorkflowsError('NOT_FOUND', 'Run not found');
    }
    return { run, steps: labWorkflowRunsRepository.listStepsForRun(runId) };
  }

  /**
   * Delete one or more run-history rows.
   *
   * Write access, not read: dismissing history is a mutation of the record a user relies on to judge
   * whether the workflow works, so a viewer must not be able to do it. Nothing else depends on these
   * rows — steps cascade — so an explicit delete needs no further cleanup.
   *
   * Returns how many were actually removed. Ids that do not belong to this workflow are skipped
   * rather than erroring the whole batch: the caller is deleting a selection they just saw, and one
   * stale id (a run pruned by retention between render and click) should not make the other
   * twenty deletions fail.
   */
  deleteRunsForCaller(caller: User, workflowId: string, runIds: readonly string[]): number {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot delete run history');
    }
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, workflow);
    let removed = 0;
    for (const runId of runIds) {
      removed += labWorkflowRunsRepository.deleteRun(workflowId, runId);
    }
    return removed;
  }

  /**
   * Saved trigger payloads for a workflow (W5b).
   *
   * Samples are readable by anyone who may read the workflow, but writable only by those who may
   * write it. A viewer reading the list is harmless; a viewer adding a payload that another author
   * will then replay is not.
   */
  listMockSamplesForCaller(caller: User, workflowId: string): LabWorkflowMockSample[] {
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanReadWorkflow(caller, workflow);
    return labWorkflowMockSamplesRepository.listForWorkflow(workflowId);
  }

  createMockSampleForCaller(
    caller: User,
    workflowId: string,
    body: unknown,
  ): LabWorkflowMockSample {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot save mock payloads');
    }
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, workflow);

    const parsed = parseMockSampleInput(body);
    const triggerNode = isLabWorkflowDefinitionV2(workflow.definition)
      ? workflow.definition.nodes.find((node) => node.id === parsed.triggerNodeId)
      : undefined;
    if (!triggerNode || triggerNode.kind !== 'trigger') {
      // A sample attached to a node that is not the trigger would never be offered in the picker,
      // so it is a mistake worth rejecting rather than storing invisibly.
      throw new LabWorkflowsError(
        'INVALID_INPUT',
        'triggerNodeId must name the trigger node of this workflow',
      );
    }

    const id = randomUUID();
    labWorkflowMockSamplesRepository.insert({
      id,
      workflowId,
      triggerNodeId: parsed.triggerNodeId,
      name: parsed.name,
      envelopeJson: JSON.stringify(parsed.envelope),
      createdByUserId: caller.userId,
    });

    const stored = labWorkflowMockSamplesRepository.getById(workflowId, id);
    if (!stored) {
      throw new LabWorkflowsError('INVALID_INPUT', 'Failed to save mock payload');
    }
    return stored;
  }

  deleteMockSampleForCaller(caller: User, workflowId: string, sampleId: string): void {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot delete mock payloads');
    }
    const workflow = labWorkflowsRepository.getById(workflowId);
    if (!workflow) {
      throw new LabWorkflowsError('NOT_FOUND', 'Workflow not found');
    }
    this.assertCanWriteWorkflow(caller, workflow);
    const deleted = labWorkflowMockSamplesRepository.delete(workflowId, sampleId);
    if (!deleted) {
      throw new LabWorkflowsError('NOT_FOUND', 'Mock sample not found');
    }
  }

  async dryRunForCaller(
    caller: User,
    envelope: LabDomainEventEnvelopeV1,
    workflowId?: string,
  ): Promise<{ matches: boolean; steps: LabWorkflowStepV1[]; reason?: string }> {
    if (caller.role === 'viewer') {
      throw new LabWorkflowsError('FORBIDDEN', 'Viewers cannot dry-run workflows');
    }
    const workflows = workflowId
      ? [labWorkflowsRepository.getById(workflowId)].filter((w): w is LabWorkflowRecord => w != null)
      : this.listForCaller(caller).filter((w) => w.enabled);

    const steps: LabWorkflowStepV1[] = [];
    for (const workflow of workflows) {
      if (workflowId) {
        this.assertCanReadWorkflow(caller, workflow);
      }
      const match = await this.workflowMatchesEvent(workflow, envelope);
      if (match.matches) {
        steps.push(...collectWorkflowStepsPreview(workflow.definition));
      } else if (workflowId) {
        return { matches: false, steps: [], reason: match.reason };
      }
    }
    return { matches: steps.length > 0, steps };
  }

  async workflowMatchesEvent(
    workflow: LabWorkflowRecord,
    envelope: LabDomainEventEnvelopeV1,
  ): Promise<{ matches: boolean; reason?: string }> {
    if (!workflow.enabled) {
      return { matches: false, reason: 'Workflow disabled' };
    }
    const triggerEventType = getWorkflowTriggerEventType(workflow.definition);
    if (!triggerEventType || !eventTypeMatches(triggerEventType, envelope.type)) {
      return { matches: false, reason: 'Event type mismatch' };
    }
    const topLevelConditions = getWorkflowTopLevelConditions(workflow.definition);
    if (topLevelConditions?.length) {
      const conditionsOk = await workflowConditionsMatch(
        topLevelConditions,
        envelope.payload,
        {
          scope: workflow.scope,
          ownerUserId: workflow.ownerUserId,
        },
        envelope,
      );
      if (!conditionsOk) {
        return { matches: false, reason: 'Conditions not met' };
      }
    }
    if (workflow.scope === 'user') {
      const actor = envelope.actorUserId ?? null;
      if (actor == null || workflow.ownerUserId !== actor) {
        return { matches: false, reason: 'Actor does not own user workflow' };
      }
    }
    return { matches: true };
  }

  listEnabledForEvaluation(actorUserId: number | null | undefined): LabWorkflowRecord[] {
    const actor = actorUserId != null && actorUserId > 0 ? actorUserId : null;
    return labWorkflowsRepository.listEnabledWorkflowsForEvaluation(actor);
  }

  private assertCanReadWorkflow(caller: User, workflow: LabWorkflowRecord): void {
    if (isPlatformWorkflowsAdmin(caller)) {
      return;
    }
    if (workflow.scope === 'user' && workflow.ownerUserId === caller.userId) {
      return;
    }
    throw new LabWorkflowsError('FORBIDDEN', 'Cannot read this workflow');
  }

  private assertCanWriteWorkflow(caller: User, workflow: LabWorkflowRecord): void {
    if (isPlatformWorkflowsAdmin(caller)) {
      return;
    }
    if (workflow.scope === 'user' && workflow.ownerUserId === caller.userId) {
      return;
    }
    throw new LabWorkflowsError('FORBIDDEN', 'Cannot modify this workflow');
  }

  private assertEnableLimits(scope: LabWorkflowScope, ownerUserId: number | null): void {
    if (scope === 'global') {
      if (labWorkflowsRepository.countEnabledGlobal() >= MAX_ENABLED_GLOBAL) {
        throw new LabWorkflowsError('LIMIT', 'Maximum enabled global workflows reached');
      }
      return;
    }
    if (ownerUserId == null) {
      throw new LabWorkflowsError('INVALID_INPUT', 'User workflow requires owner');
    }
    if (labWorkflowsRepository.countEnabledForOwner(ownerUserId) >= MAX_ENABLED_PER_USER) {
      throw new LabWorkflowsError('LIMIT', 'Maximum enabled user workflows reached for owner');
    }
  }

  /**
   * Make `lab_workflow_schedules` match the schedules authored on the graph (34.3/34.4).
   *
   * ## Why this is a reconcile rather than a CRUD surface
   *
   * The graph is the **single source of truth** for a schedule's pattern; the row holds the pattern
   * *and* runtime state (`next_fire_at`, `last_fired_at`). Two write paths that each validated their
   * own input would eventually disagree, and the way that shows up is a workflow firing on a pattern
   * nobody can see. So the only way to author a schedule is to edit the graph and save.
   *
   * ## What it preserves
   *
   * - **The row id** when the pattern is unchanged, so `last_fired_at` and the run history stay
   *   attached. Deleting and re-inserting on every edit would reset the fire history on an unrelated
   *   rename.
   * - **`next_fire_at`** when the pattern is unchanged: the tick may have just advanced it, and
   *   recomputing against `now` would push the next fire out by a tick on every save.
   * - A trigger node that no longer carries a schedule has its row **deleted**. That is the
   *   correctness half: a stale row keeps firing a pattern the author removed.
   */
  private syncSchedulesForWorkflow(workflow: LabWorkflowRecord): ScheduleSyncResult {
    const warnings: ScheduleSyncWarning[] = [];
    const now = new Date().toISOString();

    // A graph with no schedule needs no reconcile, and returning early avoids opening a statement
    // that only exists once the schedules repository is bootstrapped. Not every caller that saves a
    // graph also bootstraps the schedule table (a version rollback test, for instance), and reconcile
    // must never be the reason a save fails.
    const authoredTriggers = new Map<string, LabWorkflowTriggerScheduleV1>();
    if (isLabWorkflowDefinitionV2(workflow.definition)) {
      for (const node of workflow.definition.nodes) {
        if (node.kind === 'trigger' && node.schedule) {
          authoredTriggers.set(node.id, node.schedule);
        }
      }
    }
    if (authoredTriggers.size === 0) {
      // Still clear a stale row if the table is available — a schedule removed from the graph must
      // stop firing. Guarded because the row may never have existed.
      try {
        for (const row of labWorkflowSchedulesRepository.listForWorkflow(workflow.id)) {
          labWorkflowSchedulesRepository.delete(row.id);
        }
      } catch {
        // Schedules are not bootstrapped in this process; there is nothing to reconcile.
      }
      return { schedules: [], warnings };
    }

    const existing = labWorkflowSchedulesRepository.listForWorkflow(workflow.id);
    const existingByTrigger = new Map(existing.map((row) => [row.triggerNodeId, row]));

    // 1. Delete rows whose trigger no longer authors a schedule.
    for (const row of existing) {
      if (!authoredTriggers.has(row.triggerNodeId)) {
        labWorkflowSchedulesRepository.delete(row.id);
      }
    }

    // 2. Insert or update the rest.
    for (const [triggerNodeId, schedule] of authoredTriggers) {
      const row = existingByTrigger.get(triggerNodeId);
      const pattern = schedulePatternKey(schedule);
      const expression = schedule.kind === 'interval' ? null : (schedule.expression ?? '').trim();
      const intervalMinutes = schedule.kind === 'interval' ? (schedule.intervalMinutes ?? null) : null;

      const rowPattern = row
        ? schedulePatternKey({
            kind: row.kind as LabWorkflowTriggerScheduleV1['kind'],
            expression: row.expression ?? undefined,
            timezone: row.timezone,
            intervalMinutes: row.intervalMinutes ?? undefined,
          })
        : null;

      if (row && rowPattern === pattern) {
        // Unchanged: keep the runtime state, but repair a row the tick could never see (e.g. one
        // written before the pattern was validated and parked at `next_fire_at = null`).
        if (row.nextFireAt == null) {
          const next = this.computeNextFireForSchedule(schedule, null, now);
          if (next.nextFireAt) {
            labWorkflowSchedulesRepository.setNextFireAt(row.id, next.nextFireAt);
          }
          if (next.warnings.length > 0) {
            warnings.push({ triggerNodeId, warnings: next.warnings });
          }
        }
        continue;
      }

      const next = this.computeNextFireForSchedule(schedule, row?.lastFiredAt ?? null, now);
      if (next.warnings.length > 0) {
        warnings.push({ triggerNodeId, warnings: next.warnings });
      }

      if (row) {
        labWorkflowSchedulesRepository.update(row.id, {
          kind: schedule.kind,
          expression,
          timezone: schedule.timezone.trim(),
          intervalMinutes,
          enabled: true,
        });
        labWorkflowSchedulesRepository.setNextFireAt(row.id, next.nextFireAt);
      } else {
        labWorkflowSchedulesRepository.insert({
          id: randomUUID(),
          workflowId: workflow.id,
          triggerNodeId,
          kind: schedule.kind,
          expression,
          timezone: schedule.timezone.trim(),
          intervalMinutes,
          nextFireAt: next.nextFireAt,
          enabled: true,
        });
      }
    }

    return { schedules: labWorkflowSchedulesRepository.listForWorkflow(workflow.id), warnings };
  }

  /**
   * `next_fire_at` computed **at write time** (34.4).
   *
   * Without it the first fire is up to one tick late — which reads as "the schedule does not work"
   * during the demo that proves it does. For `interval` the previous fire is passed through so an
   * edit does not re-anchor the cadence to now.
   */
  private computeNextFireForSchedule(
    schedule: LabWorkflowTriggerScheduleV1,
    lastFiredAt: string | null,
    nowIso: string,
  ): { nextFireAt: string | null; warnings: string[] } {
    return computeNextFireAt({
      kind: schedule.kind,
      expression: schedule.kind === 'interval' ? null : (schedule.expression ?? ''),
      timezone: schedule.timezone,
      intervalMinutes: schedule.kind === 'interval' ? (schedule.intervalMinutes ?? null) : null,
      lastFiredAt,
      after: DateTime.fromISO(nowIso, { zone: 'utc' }),
    });
  }

  /**
   * Reject a graph with structural errors (W3.3).
   *
   * This lives in the service rather than the route because **two** routes create workflows: the
   * platform route and the integration-connector route. A route-level check would let the connector
   * path save a broken graph. Warnings are returned to the caller but never block — an unreachable
   * node is usually a mistake, not an impossibility.
   *
   * Observed event types are passed in so a trigger using a real-but-undocumented event does not
   * warn. Without them, the validator would treat the static catalog as the whole truth and flag
   * channels that are demonstrably live.
   */
  /**
   * Drop edges that duplicate an earlier edge's id or route, keeping the graph the author can see.
   *
   * The canvas keys edges by id, so a repeated id is **one** drawn connector backed by two stored
   * entries. The shadowed entry is unselectable, which means the user has no way to remove it — the
   * exact "orphaned edge" they cannot clear. Healing here (rather than only in the designer's write
   * funnel) covers MCP writes, imports and the integration-connector route too.
   *
   * This is a *repair*, not a rejection: `assertDefinitionValid` below rejects a graph that already
   * reached storage with duplicates only because there is no safe way to guess which twin the author
   * meant. When a fresh save arrives we can simply keep the first occurrence, which is what was drawn.
   */
  private withoutDuplicateEdges(
    definition: LabWorkflowRecord['definition'],
  ): LabWorkflowRecord['definition'] {
    if (!isLabWorkflowDefinitionV2(definition)) {
      return definition;
    }
    const { edges, removedIds } = dedupeLabWorkflowGraphEdges(definition.edges);
    if (removedIds.length === 0) {
      return definition;
    }
    void VSCodeLogger.getInstance().then((logger) =>
      logger.warn(
        `[lab-workflows] dropped ${removedIds.length} duplicate edge(s) from workflow definition: ${removedIds.join(', ')}`,
      ),
    );
    return { ...definition, edges };
  }

  private assertDefinitionValid(definition: LabWorkflowRecord['definition']): void {
    if (!isLabWorkflowDefinitionV2(definition)) {
      // V1 definitions are a flat step list: there is no graph to validate, and the schema already
      // enforced the step constraints.
      return;
    }
    const result = validateWorkflowDefinition(definition, {
      observedEventTypes: labEventsRepository.listDistinctEventTypes(200),
      declaredCatalogEntries: loadDeclaredDomainEventCatalogEntries(),
    });
    if (!result.valid) {
      throw new LabWorkflowsError(
        'INVALID_INPUT',
        `Workflow graph is invalid: ${result.errors.map((issue) => issue.message).join(' ')}`,
        result.errors.map((issue) => ({
          code: issue.code,
          targetId: issue.targetId,
          message: issue.message,
        })),
      );
    }
  }
}

export class LabWorkflowsError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_INPUT' | 'LIMIT',
    message: string,
    /** Field-level validation issues, when the error came from graph validation (W3). */
    public readonly issues?: Array<{ code: string; targetId: string | null; message: string }>,
  ) {
    super(message);
    this.name = 'LabWorkflowsError';
  }
}

export const labWorkflowsService = LabWorkflowsService.getInstance();
