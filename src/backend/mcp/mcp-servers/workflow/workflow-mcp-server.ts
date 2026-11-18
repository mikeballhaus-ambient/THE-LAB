import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  labWorkflowCreateSchemaFields,
  labWorkflowDeleteSchemaFields,
  labWorkflowDryRunSchemaFields,
  labWorkflowDuplicateSchemaFields,
  labWorkflowEnableSchemaFields,
  labWorkflowGetExecutionSchemaFields,
  labWorkflowGetFailuresSchemaFields,
  labWorkflowGetSchemaFields,
  labWorkflowListAppServicesSchemaFields,
  labWorkflowListExecutionsSchemaFields,
  labWorkflowListNodeTypesSchemaFields,
  labWorkflowListSchemaFields,
  labWorkflowListTriggerEventsSchemaFields,
  labWorkflowListVersionsSchemaFields,
  labWorkflowListenSchemaFields,
  labWorkflowMockSamplesSchemaFields,
  labWorkflowPublishVersionSchemaFields,
  labWorkflowRunSchemaFields,
  labWorkflowSetScheduleSchemaFields,
  labWorkflowUpdateSchemaFields,
  labWorkflowValidateSchemaFields,
} from '@/shared/types/schemas/lab-workflow-mcp-schemas';
import {
  labWorkflowCreate,
  labWorkflowDelete,
  labWorkflowDisable,
  labWorkflowDryRun,
  labWorkflowDuplicate,
  labWorkflowEnable,
  labWorkflowGet,
  labWorkflowGetExecution,
  labWorkflowGetFailures,
  labWorkflowList,
  labWorkflowListAppServices,
  labWorkflowListExecutions,
  labWorkflowListNodeTypes,
  labWorkflowListTriggerEvents,
  labWorkflowListVersions,
  labWorkflowListen,
  labWorkflowMockSamples,
  labWorkflowPublishVersion,
  labWorkflowRun,
  labWorkflowSetSchedule,
  labWorkflowUpdate,
  labWorkflowValidate,
} from './workflow-mcp-handlers';

/**
 * Workflow Studio MCP server (M0–M3).
 *
 * ## The authoring loop this exists to make possible
 *
 * ```text
 * lab_workflow_list_node_types      → what can a node be?
 * lab_workflow_list_trigger_events  → what can start it?
 * lab_workflow_validate             → is the graph runnable?
 * lab_workflow_dry_run              → what would it do?
 * lab_workflow_create               → save it
 * lab_workflow_run                  → execute for real
 * lab_workflow_get_execution        → what actually happened?
 * ```
 *
 * Every tool description states **when** to use it, because an agent selects tools by reading them —
 * not by knowing the plan. Several also state what the tool will *not* do, which is the more useful
 * half: an agent that knows `dry_run` never writes will stop asking whether it is safe.
 *
 * ## What this server deliberately does not do
 *
 * - No direct SQL. Every operation delegates to [`labWorkflowsService`](../../../db/LabWorkflows/lab-workflows-service.ts),
 *   so validation, scope filtering and enable limits behave identically to the UI.
 * - No implicit "enable then run". Running a disabled workflow is a manual test; enabling is a
 *   production decision and has its own tool.
 * - No listener that outlives the call. `lab_workflow_listen` waits briefly and then reports; the
 *   5-minute TTL is the backstop.
 */

export const workflowMcpServer = new McpServer({
  name: 'system-workflow-studio-server',
  version: '1.0.0',
});

const LIST_NODE_TYPES_DESC =
  'Lists everything a workflow graph can contain: the five graph node kinds (trigger, condition, rule, ' +
  'action, group) plus every action `step.kind` with its JSON parameter schema. ' +
  'Call this FIRST when authoring — it is the only authoritative answer to "which fields does a node take". ' +
  'The step catalogue is derived from the same schema the validator uses, so anything listed here ' +
  'will parse. `writesMoney` marks nodes that need confirmMoneyWrites.';

const LIST_TRIGGER_EVENTS_DESC =
  'Lists lab domain event types a trigger can listen for, grouped by source app, with payload field hints. ' +
  'Use it to choose a trigger `eventType` before building a graph, or to check whether one is real. ' +
  'Entries with `neverFired: true` are documented contracts nobody has published yet: a workflow on one ' +
  'saves cleanly and will not fire — say so to the user instead of building on it silently. ' +
  'Observed-but-undocumented types are included, so a working event is never hidden.';

const LIST_APP_SERVICES_DESC =
  'Lists connector-backed services (appId + serviceId + entity properties) that platform and integration ' +
  'nodes can read or write. Use it before configuring `lab_query_app`, `integration_create`, ' +
  '`integration_update` or `integration_delete`. ' +
  'A write into `app-lab-financial-ledger` counts as a money write and requires confirmMoneyWrites. ' +
  'Filtered to apps the calling user may read — an empty list means no readable manifests, not no apps.';

const VALIDATE_DESC =
  'Checks a workflow definition without saving it. Returns `{ valid, errors[], warnings[] }` with a stable ' +
  '`code` and `targetId` per issue. ' +
  'Use it before EVERY create or update: those reject an invalid graph, and this returns the same ' +
  'machine-readable reasons so you can correct in one turn. ' +
  'Errors block saving; warnings never do — an unreachable node is usually a mistake, but it runs. ' +
  'Checks what the schema cannot: dangling edges, duplicate ids, cycles, multiple triggers, unreachable nodes.';

const LIST_DESC =
  'Lists workflows the caller may see: their own user-scoped workflows, or (for owner/admin) every workflow ' +
  'including global ones. Use it to find a workflow id, to check whether an automation already exists, or ' +
  'to audit what is enabled. Returns a summary per workflow — call lab_workflow_get for the full definition.';

const GET_DESC =
  'Returns one workflow with its full definition and its current validation result. ' +
  'Use it before editing so you change the stored graph rather than a guess. ' +
  'Scope is enforced: a member receives NOT_FOUND for another user\'s workflow and for any global workflow.';

const CREATE_DESC =
  'Creates a workflow. The graph is validated first and an invalid one is REJECTED with field-level errors — ' +
  'an agent must not be able to save a graph that fails silently later. ' +
  'Algorithm: list_node_types → assemble nodes/edges → validate → (fix) → create. ' +
  'A member always gets `user` scope owned by themselves; only owner/admin may create a global workflow. ' +
  'A graph containing a money-writing node requires `confirmMoneyWrites: true`, which is written to the ' +
  'platform audit log — ask the user explicitly before sending it. Returns `{ workflowId, validation }`.';

const UPDATE_DESC =
  'Updates an existing workflow\'s metadata and/or definition. Validated exactly like create, and the same ' +
  'rejection applies. ' +
  'The money guard is evaluated on the graph that will be live afterwards; sending only `enabled` or `name` ' +
  'does not require re-confirming an existing money write. ' +
  'Fetch the current definition with lab_workflow_get first — this replaces `definition` wholesale, it does ' +
  'not merge nodes.';

const DUPLICATE_DESC =
  'Copies a workflow\'s graph into a new workflow — the "same as the one that works, but for invoices" pattern. ' +
  'Runs, steps and mock samples are NOT copied (history belongs to the original). ' +
  'Node and edge ids are preserved because they only need to be unique within one graph. ' +
  'A money-writing source still requires confirmMoneyWrites. Default name is "<name> (copy)".';

const DELETE_DESC =
  'Deletes a workflow and everything scoped to it: runs, steps, mock samples, schedules and webhooks ' +
  '(ON DELETE CASCADE). Requires `confirm: true` — ask the user before calling. ' +
  'This is irreversible from the app; published versions are retained but orphaned.';

const RUN_DESC =
  'Executes a workflow NOW for real and records it in the run history (triggerType `manual`). ' +
  'Supply the trigger payload with `payload` (one record), `items` (multi-element arrays are nested ' +
  'under payload.items — add Split Out to fan them out), `envelope` (full event), or `mockSampleId`. ' +
  'Runs even when the workflow is disabled: that is the point of a manual test. ' +
  'Notifications, provider writes and published events really happen — use lab_workflow_dry_run first ' +
  'unless the user asked for a real run. Returns `{ executionId, status, steps[] }`.';

const DRY_RUN_DESC =
  'Evaluates a workflow without any side effect: no run row, no notification, no provider write, no ' +
  'published event. Each side-effecting node reports what it WOULD have done (recipients, rendered copy, ' +
  'request body, ledger balance). ' +
  'This is the safe way to answer "does this work?" and the right tool for an authoring loop. ' +
  'Accepts the same payload/items/envelope/mockSampleId inputs as lab_workflow_run.';

const MOCK_SAMPLES_DESC =
  'Manages saved trigger payloads for a workflow: `list`, `save`, `delete`. ' +
  'A saved sample is the only way to replay a payload shape an agent cannot invent (a webhook body from an ' +
  'external system). Saving requires a full envelope, because a sample also fixes the event type and actor. ' +
  'Use it when the same test payload is needed across turns, or after lab_workflow_listen captures one.';

const LISTEN_DESC =
  'Arms a workflow for the NEXT real trigger, so you can observe a real payload instead of guessing its shape. ' +
  'Actions: `arm` (default), `status`, `disarm`. ' +
  'Single use, 5-minute TTL, in memory, dry by default — a capture must not notify anyone. ' +
  'The wait is capped: if nothing arrives the call returns `armed: true` and the arm stays live, so telling ' +
  'the user to trigger the event and then checking status is the intended flow. ' +
  'A capture is saved as a mock sample AND recorded as a run. ' +
  'Webhook triggers are supported: the delivery route satisfies the arm itself, so `webhookListeningSupported` ' +
  'is true and the captured body becomes a reusable sample.';

const GET_EXECUTION_DESC =
  'Returns one run: status, timings, per-node items in/out, each node\'s detail, and any error. ' +
  'A node that did not execute has NO step row — absence is the record of what was skipped, which is how you ' +
  'distinguish "the rule declined" from "the node was never reached". ' +
  'Oversized payloads are replaced with an explicit truncation marker, never silently cut.';

const LIST_EXECUTIONS_DESC =
  'Lists recent runs, optionally for one workflow and/or one status. Use it to answer "did my workflow fire?", ' +
  '"what failed recently?" or to find an executionId. ' +
  'Scope is enforced per workflow, so a member only ever sees runs of workflows they can read.';

const ENABLE_DESC =
  'Enables a workflow so it runs on every matching event. ' +
  'Enabling is a production decision and is subject to per-scope limits (global and per-owner); hitting a ' +
  'limit returns LIMIT. Use lab_workflow_dry_run and lab_workflow_run first — a disabled workflow can be ' +
  'tested without enabling it, so there is no reason to enable in order to test.';

const DISABLE_DESC =
  'Disables a workflow: it stops reacting to events, scheduled ticks and webhooks. ' +
  'It can still be dry-run and run manually, which makes this the safe way to take an automation out of ' +
  'production without losing it.';

const GET_FAILURES_DESC =
  'Lists recent FAILED runs with the failing node and its error, optionally for one workflow. ' +
  'Use it as the first step when an automation "stopped working" — it is faster and more precise than ' +
  'reading the whole run list. A failure also publishes `platform-workflows.run.failed`, so an error-triggered ' +
  'workflow can respond without polling this tool.';

const LIST_VERSIONS_DESC =
  'Lists published versions of a workflow (newest first). Publishing is separate from saving: saving changes ' +
  'what runs next, publishing records the shape worth keeping. Use it to find a `versionId` for rollback.';

const SET_SCHEDULE_DESC =
  'Sets or clears a wall-clock schedule on a workflow trigger, so the workflow fires on the clock instead ' +
  'of (or as well as) an event. Pass `schedule: null` to remove it. ' +
  'CRON FIELD ORDER is **minute hour day-of-month month day-of-week** — exactly 5 fields. ' +
  '`0 9 * * 1-5` is 09:00 Monday–Friday. Six fields (seconds or a year) are REJECTED, not reinterpreted. ' +
  'The time zone must be an IANA NAME (`America/Denver`), never an offset: an offset breaks at daylight ' +
  'saving. `interval` uses `intervalMinutes` instead of an expression. ' +
  'NOT offered: `relative` / `staleness`; they need a record date the platform clock never has, so they ' +
  'would author a schedule that never fires — per-record timing is the requirement sweep. ' +
  'Returns the computed `nextFireAt`, so you can confirm the pattern before the first fire. ' +
  'The workflow must already exist; use lab_workflow_get first to see the trigger node id.';

const PUBLISH_VERSION_DESC =
  'Snapshots the current graph as a restorable version (`action: publish`, optional `note`), or restores a ' +
  'published version as the live graph (`action: rollback`, requires `versionId`). ' +
  'A rollback re-validates the snapshot first: a version published before a validator rule existed may be ' +
  'invalid today, and silently restoring it would make an unrunnable workflow live. ' +
  'Rollback copies the snapshot forward — versions published after it are retained, so you can roll forward again.';

workflowMcpServer.registerTool(
  'lab_workflow_list_node_types',
  { description: LIST_NODE_TYPES_DESC, inputSchema: labWorkflowListNodeTypesSchemaFields },
  async (params) => {
    const result = await labWorkflowListNodeTypes(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_list_trigger_events',
  { description: LIST_TRIGGER_EVENTS_DESC, inputSchema: labWorkflowListTriggerEventsSchemaFields },
  async (params) => {
    const result = await labWorkflowListTriggerEvents(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_list_app_services',
  { description: LIST_APP_SERVICES_DESC, inputSchema: labWorkflowListAppServicesSchemaFields },
  async (params) => {
    const result = await labWorkflowListAppServices(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_validate',
  { description: VALIDATE_DESC, inputSchema: labWorkflowValidateSchemaFields },
  async (params) => {
    const result = await labWorkflowValidate(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_list',
  { description: LIST_DESC, inputSchema: labWorkflowListSchemaFields },
  async (params) => {
    const result = await labWorkflowList(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_get',
  { description: GET_DESC, inputSchema: labWorkflowGetSchemaFields },
  async (params) => {
    const result = await labWorkflowGet(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_create',
  { description: CREATE_DESC, inputSchema: labWorkflowCreateSchemaFields },
  async (params) => {
    const result = await labWorkflowCreate(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_update',
  { description: UPDATE_DESC, inputSchema: labWorkflowUpdateSchemaFields },
  async (params) => {
    const result = await labWorkflowUpdate(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_duplicate',
  { description: DUPLICATE_DESC, inputSchema: labWorkflowDuplicateSchemaFields },
  async (params) => {
    const result = await labWorkflowDuplicate(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_delete',
  { description: DELETE_DESC, inputSchema: labWorkflowDeleteSchemaFields },
  async (params) => {
    const result = await labWorkflowDelete(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_run',
  { description: RUN_DESC, inputSchema: labWorkflowRunSchemaFields },
  async (params) => {
    const result = await labWorkflowRun(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_dry_run',
  { description: DRY_RUN_DESC, inputSchema: labWorkflowDryRunSchemaFields },
  async (params) => {
    const result = await labWorkflowDryRun(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_mock_samples',
  { description: MOCK_SAMPLES_DESC, inputSchema: labWorkflowMockSamplesSchemaFields },
  async (params) => {
    const result = await labWorkflowMockSamples(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_listen',
  { description: LISTEN_DESC, inputSchema: labWorkflowListenSchemaFields },
  async (params) => {
    const result = await labWorkflowListen(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_get_execution',
  { description: GET_EXECUTION_DESC, inputSchema: labWorkflowGetExecutionSchemaFields },
  async (params) => {
    const result = await labWorkflowGetExecution(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_list_executions',
  { description: LIST_EXECUTIONS_DESC, inputSchema: labWorkflowListExecutionsSchemaFields },
  async (params) => {
    const result = await labWorkflowListExecutions(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_enable',
  { description: ENABLE_DESC, inputSchema: labWorkflowEnableSchemaFields },
  async (params) => {
    const result = await labWorkflowEnable(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_disable',
  { description: DISABLE_DESC, inputSchema: labWorkflowEnableSchemaFields },
  async (params) => {
    const result = await labWorkflowDisable(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_get_failures',
  { description: GET_FAILURES_DESC, inputSchema: labWorkflowGetFailuresSchemaFields },
  async (params) => {
    const result = await labWorkflowGetFailures(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_list_versions',
  { description: LIST_VERSIONS_DESC, inputSchema: labWorkflowListVersionsSchemaFields },
  async (params) => {
    const result = await labWorkflowListVersions(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_set_schedule',
  { description: SET_SCHEDULE_DESC, inputSchema: labWorkflowSetScheduleSchemaFields },
  async (params) => {
    const result = await labWorkflowSetSchedule(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

workflowMcpServer.registerTool(
  'lab_workflow_publish_version',
  { description: PUBLISH_VERSION_DESC, inputSchema: labWorkflowPublishVersionSchemaFields },
  async (params) => {
    const result = await labWorkflowPublishVersion(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

export const workflowToolsManifest = [
  {
    id: 'lab_workflow_list_node_types',
    name: 'Workflow Studio - List Node Types',
    description: LIST_NODE_TYPES_DESC,
    params: labWorkflowListNodeTypesSchemaFields,
  },
  {
    id: 'lab_workflow_list_trigger_events',
    name: 'Workflow Studio - List Trigger Events',
    description: LIST_TRIGGER_EVENTS_DESC,
    params: labWorkflowListTriggerEventsSchemaFields,
  },
  {
    id: 'lab_workflow_list_app_services',
    name: 'Workflow Studio - List App Services',
    description: LIST_APP_SERVICES_DESC,
    params: labWorkflowListAppServicesSchemaFields,
  },
  {
    id: 'lab_workflow_validate',
    name: 'Workflow Studio - Validate',
    description: VALIDATE_DESC,
    params: labWorkflowValidateSchemaFields,
  },
  {
    id: 'lab_workflow_list',
    name: 'Workflow Studio - List Workflows',
    description: LIST_DESC,
    params: labWorkflowListSchemaFields,
  },
  {
    id: 'lab_workflow_get',
    name: 'Workflow Studio - Get Workflow',
    description: GET_DESC,
    params: labWorkflowGetSchemaFields,
  },
  {
    id: 'lab_workflow_create',
    name: 'Workflow Studio - Create Workflow',
    description: CREATE_DESC,
    params: labWorkflowCreateSchemaFields,
  },
  {
    id: 'lab_workflow_update',
    name: 'Workflow Studio - Update Workflow',
    description: UPDATE_DESC,
    params: labWorkflowUpdateSchemaFields,
  },
  {
    id: 'lab_workflow_duplicate',
    name: 'Workflow Studio - Duplicate Workflow',
    description: DUPLICATE_DESC,
    params: labWorkflowDuplicateSchemaFields,
  },
  {
    id: 'lab_workflow_delete',
    name: 'Workflow Studio - Delete Workflow',
    description: DELETE_DESC,
    params: labWorkflowDeleteSchemaFields,
  },
  {
    id: 'lab_workflow_run',
    name: 'Workflow Studio - Run Workflow',
    description: RUN_DESC,
    params: labWorkflowRunSchemaFields,
  },
  {
    id: 'lab_workflow_dry_run',
    name: 'Workflow Studio - Dry Run',
    description: DRY_RUN_DESC,
    params: labWorkflowDryRunSchemaFields,
  },
  {
    id: 'lab_workflow_mock_samples',
    name: 'Workflow Studio - Mock Samples',
    description: MOCK_SAMPLES_DESC,
    params: labWorkflowMockSamplesSchemaFields,
  },
  {
    id: 'lab_workflow_listen',
    name: 'Workflow Studio - Listen',
    description: LISTEN_DESC,
    params: labWorkflowListenSchemaFields,
  },
  {
    id: 'lab_workflow_get_execution',
    name: 'Workflow Studio - Get Execution',
    description: GET_EXECUTION_DESC,
    params: labWorkflowGetExecutionSchemaFields,
  },
  {
    id: 'lab_workflow_list_executions',
    name: 'Workflow Studio - List Executions',
    description: LIST_EXECUTIONS_DESC,
    params: labWorkflowListExecutionsSchemaFields,
  },
  {
    id: 'lab_workflow_enable',
    name: 'Workflow Studio - Enable',
    description: ENABLE_DESC,
    params: labWorkflowEnableSchemaFields,
  },
  {
    id: 'lab_workflow_disable',
    name: 'Workflow Studio - Disable',
    description: DISABLE_DESC,
    params: labWorkflowEnableSchemaFields,
  },
  {
    id: 'lab_workflow_get_failures',
    name: 'Workflow Studio - Get Failures',
    description: GET_FAILURES_DESC,
    params: labWorkflowGetFailuresSchemaFields,
  },
  {
    id: 'lab_workflow_list_versions',
    name: 'Workflow Studio - List Versions',
    description: LIST_VERSIONS_DESC,
    params: labWorkflowListVersionsSchemaFields,
  },
  {
    id: 'lab_workflow_set_schedule',
    name: 'Workflow Studio - Set Schedule',
    description: SET_SCHEDULE_DESC,
    params: labWorkflowSetScheduleSchemaFields,
  },
  {
    id: 'lab_workflow_publish_version',
    name: 'Workflow Studio - Publish Version',
    description: PUBLISH_VERSION_DESC,
    params: labWorkflowPublishVersionSchemaFields,
  },
];
