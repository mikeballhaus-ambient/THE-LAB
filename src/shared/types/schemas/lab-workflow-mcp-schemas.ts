import { z } from 'zod';

/**
 * Parameter schemas for the Workflow MCP server (M0–M3).
 *
 * ## Why every tool takes `userId`
 *
 * The MCP layer has no ambient session — a tool call arrives as JSON. The platform convention
 * (see `lab-integrations-mcp-schemas.ts`) is that the caller's platform user id is an explicit
 * argument, injected from the system-instruction context. Authorisation then happens **once**, in
 * [`labWorkflowsService`](../../../backend/db/LabWorkflows/lab-workflows-service.ts), using the same
 * `User` record the HTTP routes use. An MCP tool must not invent a different permission model: an
 * agent that can call `lab_workflow_create` gets exactly the rights of the human it is acting for,
 * which is what makes `viewer` refusal and `user`-scope isolation testable.
 */

const userIdField = z
  .number()
  .int()
  .positive()
  .describe('REQUIRED. Platform user id from the system instructions {{USERID}} context.');

const workflowIdField = z.string().uuid().describe('Workflow id (UUID) from lab_workflow_list.');

/**
 * A workflow definition, as stored in `lab_workflows.definition_json`.
 *
 * Deliberately `unknown`-valued rather than fully typed here: the authoritative schema is
 * `LabWorkflowDefinitionSchema`, and restating it in the MCP parameter schema would create a second
 * definition that can drift. The handler parses with the real schema and returns field-level errors —
 * which is also what makes `validate` and `create` agree.
 */
const definitionField = z
  .record(z.string(), z.unknown())
  .describe(
    'Workflow definition object. Pass `{ schemaVersion: 2, nodes, edges }`; obtain node shapes from ' +
      'lab_workflow_list_node_types and trigger types from lab_workflow_list_trigger_events. ' +
      'Call lab_workflow_validate first — create/update reject an invalid graph.',
  );

const payloadField = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    'Event payload used to seed the run (optional). The trigger produces ONE item from this object, ' +
      'which is what every pre-existing workflow assumes.',
  );

const itemsField = z
  .array(z.record(z.string(), z.unknown()))
  .max(100)
  .optional()
  .describe(
    'Alternative to `payload`: supply records. A single-element array becomes the payload unchanged. ' +
      'A multi-element array is exposed as `payload.items` — the trigger is single-item by contract, so ' +
      'add a Split Out node to fan the array out into separate items.',
  );

const envelopeField = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    'Full event envelope `{ schemaVersion: 1, id, type, sourceAppId, occurredAt, actorUserId?, payload }`. ' +
      'Its `type` must match the trigger, and `id` must already exist in the event log for a real run ' +
      '(notifications carry a foreign key to it). Prefer `payload`/`items`/`mockSampleId`.',
  );

const confirmMoneyWritesField = z
  .boolean()
  .optional()
  .describe(
    'REQUIRED when the graph writes money (a `ledger_post_entry` node, or an integration write into ' +
      'the Financial Ledger app). Set true only after the user has explicitly approved moving money; ' +
      'the confirmation is written to the platform audit log.',
  );

// ---------------------------------------------------------------------------------------------
// M0 — discovery
// ---------------------------------------------------------------------------------------------

export const labWorkflowListNodeTypesSchemaFields = z.object({
  userId: userIdField,
  includeSchemas: z
    .boolean()
    .optional()
    .describe('Include each node\'s full JSON parameter schema (default true). Set false for a compact catalogue.'),
});

export const labWorkflowListTriggerEventsSchemaFields = z.object({
  userId: userIdField,
  appId: z
    .string()
    .optional()
    .describe('Filter to one source app id, e.g. `app-lab-tasklist`. Omit for every app.'),
});

export const labWorkflowListAppServicesSchemaFields = z.object({
  userId: userIdField,
  appId: z
    .string()
    .optional()
    .describe('Filter to one provider app id. Omit for every app the caller may read.'),
});

export const labWorkflowValidateSchemaFields = z.object({
  userId: userIdField,
  definition: definitionField,
});

// ---------------------------------------------------------------------------------------------
// M1 — authoring
// ---------------------------------------------------------------------------------------------

export const labWorkflowListSchemaFields = z.object({
  userId: userIdField,
  scope: z.enum(['global', 'user']).optional().describe('Filter by scope (admin only; members always see their own user scope).'),
  ownerUserId: z.number().int().positive().optional().describe('Filter to workflows owned by one user (admin only).'),
  includeDisabled: z.boolean().optional().describe('Include disabled workflows (default true).'),
});

export const labWorkflowGetSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
});

export const labWorkflowCreateSchemaFields = z.object({
  userId: userIdField,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  scope: z
    .enum(['global', 'user'])
    .optional()
    .describe('Omit for a member — the service forces `user` scope owned by the caller.'),
  ownerUserId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Required for an admin creating a `user`-scoped workflow. Ignored for `global`.'),
  enabled: z.boolean().optional().describe('Defaults to true. Enabling is subject to per-scope limits.'),
  priority: z.number().int().min(1).max(1000).optional(),
  definition: definitionField,
  confirmMoneyWrites: confirmMoneyWritesField,
});

export const labWorkflowUpdateSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  definition: definitionField.optional(),
  confirmMoneyWrites: confirmMoneyWritesField,
});

export const labWorkflowDuplicateSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  name: z.string().min(1).max(200).optional().describe('Defaults to "<name> (copy)".'),
  scope: z.enum(['global', 'user']).optional().describe('Defaults to the source workflow\'s scope where the caller may use it.'),
  ownerUserId: z.number().int().positive().optional(),
  confirmMoneyWrites: confirmMoneyWritesField,
});

export const labWorkflowDeleteSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  confirm: z
    .literal(true)
    .describe(
      'Must be `true`. Deleting a workflow removes its runs, steps, mock samples, schedules and webhooks ' +
        '(ON DELETE CASCADE). Ask the user first, then call again with confirm: true.',
    ),
});

// ---------------------------------------------------------------------------------------------
// M2 — run and observe
// ---------------------------------------------------------------------------------------------

const runOptionsShape = {
  payload: payloadField,
  items: itemsField,
  envelope: envelopeField,
  mockSampleId: z
    .string()
    .uuid()
    .optional()
    .describe('Replay a saved sample instead of supplying a payload. A sample wins over payload/items.'),
};

export const labWorkflowRunSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  ...runOptionsShape,
});

export const labWorkflowDryRunSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  ...runOptionsShape,
});

export const labWorkflowMockSamplesSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  action: z
    .enum(['list', 'save', 'delete'])
    .describe('`list` for the reusable payloads, `save` to store one, `delete` to remove one.'),
  sampleId: z.string().uuid().optional().describe('Required for `delete`.'),
  name: z.string().min(1).max(120).optional().describe('Required for `save` — "the Stripe payload".'),
  triggerNodeId: z
    .string()
    .uuid()
    .optional()
    .describe('Trigger node this payload shape belongs to. Defaults to the workflow\'s only trigger.'),
  envelope: envelopeField,
});

export const labWorkflowListenSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  action: z
    .enum(['arm', 'status', 'disarm'])
    .describe(
      '`arm` watches for the next real trigger (single use, 5-minute TTL, dry by default); ' +
        '`status` reports whether an arm is live; `disarm` removes it.',
    ),
  dryRun: z
    .boolean()
    .optional()
    .describe('For `arm`: capture without side effects (default true). A wiring check must not notify anyone.'),
  waitMs: z
    .number()
    .int()
    .min(0)
    .max(60_000)
    .optional()
    .describe(
      'For `arm`: how long to wait for a capture before returning `armed` (default 15 000, max 60 000). ' +
        'The cap exists so an agent cannot leave a listener armed across turns.',
    ),
});

export const labWorkflowGetExecutionSchemaFields = z.object({
  userId: userIdField,
  runId: z.string().uuid().describe('Run id from lab_workflow_run or lab_workflow_list_executions.'),
  stepLimit: z.number().int().min(1).max(100).optional().describe('Maximum steps to include (default 50).'),
});

export const labWorkflowListExecutionsSchemaFields = z.object({
  userId: userIdField,
  workflowId: z.string().uuid().optional().describe('Limit to one workflow.'),
  status: z
    .enum(['running', 'succeeded', 'partial', 'failed', 'skipped'])
    .optional()
    .describe('Filter by terminal status.'),
  limit: z.number().int().min(1).max(100).optional().describe('Maximum runs to return (default 20).'),
});

// ---------------------------------------------------------------------------------------------
// M3 — governance
// ---------------------------------------------------------------------------------------------

export const labWorkflowEnableSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
});

/**
 * `lab_workflow_set_schedule` (phase 34).
 *
 * The schedule object is declared here rather than restated in prose because an agent that guesses
 * `m h dom mon dow` **year** (a 6-field cron) produces a schedule that is rejected at save time with
 * a message it then has to correct. The field-level descriptions state the field order and the IANA
 * requirement in the place the agent actually reads.
 *
 * `schedule: null` is a meaningful value — it clears the schedule — so the union includes `null`
 * rather than making the field optional. An omitted field would be ambiguous: "leave alone" or
 * "clear"? There is no safe default, so the caller must say which.
 */
export const labWorkflowScheduleObjectSchema = z.object({
  kind: z
    .enum(['cron', 'interval', 'recurrence'])
    .describe(
      '`cron` = a 5-field expression; `recurrence` = an RRULE body; `interval` = every N minutes. ' +
        'NOT offered: `relative` / `staleness` — they need a record date the platform clock never has, ' +
        'so they would never fire. Per-record timing is handled by the platform requirement sweep.',
    ),
  expression: z
    .string()
    .max(500)
    .optional()
    .describe(
      'cron: exactly 5 space-separated fields — **minute hour day-of-month month day-of-week** ' +
        '(e.g. `0 9 * * 1-5` = 09:00 Monday–Friday). A 6-field expression (with seconds or a year) is ' +
        'REJECTED rather than reinterpreted. recurrence: an RRULE body, e.g. `FREQ=WEEKLY;BYDAY=MO`. ' +
        'Omit for `interval`.',
    ),
  timezone: z
    .string()
    .min(1)
    .max(80)
    .describe(
      'An IANA time-zone NAME such as `America/Denver` or `Europe/London`. An offset like `-06:00` ' +
        'is rejected: a fixed offset breaks at daylight saving and the schedule would drift an hour ' +
        'twice a year.',
    ),
  intervalMinutes: z
    .number()
    .positive()
    .max(525_600)
    .optional()
    .describe(
      '`interval` only: minutes between fires, anchored to the previous fire so a late tick does not ' +
        'accumulate drift. The platform floor for a workflow is 60 seconds.',
    ),
});

export const labWorkflowSetScheduleSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  triggerNodeId: z
    .string()
    .uuid()
    .optional()
    .describe(
      'Which trigger node to schedule. Defaults to the workflow\'s only trigger; required when the ' +
        'graph has more than one.',
    ),
  schedule: labWorkflowScheduleObjectSchema
    .nullable()
    .describe(
      'The schedule to author, or `null` to remove it. Passing a schedule updates the graph and ' +
        'recomputes `nextFireAt`; passing null deletes the stored row so the workflow stops firing on ' +
        'the clock.',
    ),
});

export const labWorkflowGetFailuresSchemaFields = z.object({
  userId: userIdField,
  workflowId: z.string().uuid().optional().describe('Limit to one workflow.'),
  limit: z.number().int().min(1).max(100).optional().describe('Maximum failed runs to return (default 20).'),
});

export const labWorkflowListVersionsSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
});

export const labWorkflowPublishVersionSchemaFields = z.object({
  userId: userIdField,
  workflowId: workflowIdField,
  action: z
    .enum(['publish', 'rollback'])
    .describe(
      '`publish` snapshots the current graph as a restorable version; `rollback` copies a published ' +
        'version back as the live graph (the snapshot is re-validated first).',
    ),
  versionId: z.string().uuid().optional().describe('Required for `rollback`. From lab_workflow_list_versions.'),
  note: z.string().max(500).optional().describe('For `publish`: why this shape was kept.'),
});

// ---------------------------------------------------------------------------------------------
// Limits shared by the reader and the handlers
// ---------------------------------------------------------------------------------------------

/**
 * How long `lab_workflow_listen` will block for a capture.
 *
 * A listener that outlives a turn is a live workflow nobody is watching, so the tool waits briefly
 * and then reports `armed` rather than holding the call open. The TTL (5 minutes) is the real
 * safety net; this cap keeps one tool call from consuming an agent's whole turn.
 */
export const LAB_WORKFLOW_MCP_LISTEN_DEFAULT_WAIT_MS = 15_000;
export const LAB_WORKFLOW_MCP_LISTEN_MAX_WAIT_MS = 60_000;
export const LAB_WORKFLOW_MCP_LISTEN_POLL_MS = 500;

/**
 * Response-shaping caps (M2.7).
 *
 * An item array can be arbitrarily large and a run history longer than a context window. Truncation
 * is always **marked** — a silent cut is the one failure mode where an agent concludes "there were
 * three items" from a payload that had three hundred.
 */
export const LAB_WORKFLOW_MCP_MAX_ITEMS = 20;
export const LAB_WORKFLOW_MCP_MAX_STRING_CHARS = 2_000;
export const LAB_WORKFLOW_MCP_MAX_ARRAY_ITEMS = 25;
export const LAB_WORKFLOW_MCP_MAX_DEPTH = 6;

export type LabWorkflowListParams = z.infer<typeof labWorkflowListSchemaFields>;
export type LabWorkflowCreateParams = z.infer<typeof labWorkflowCreateSchemaFields>;
export type LabWorkflowUpdateParams = z.infer<typeof labWorkflowUpdateSchemaFields>;
export type LabWorkflowRunParams = z.infer<typeof labWorkflowRunSchemaFields>;
export type LabWorkflowMockSamplesParams = z.infer<typeof labWorkflowMockSamplesSchemaFields>;
export type LabWorkflowListenParams = z.infer<typeof labWorkflowListenSchemaFields>;
export type LabWorkflowValidateParams = z.infer<typeof labWorkflowValidateSchemaFields>;
export type LabWorkflowPublishVersionParams = z.infer<typeof labWorkflowPublishVersionSchemaFields>;
export type LabWorkflowSetScheduleParams = z.infer<typeof labWorkflowSetScheduleSchemaFields>;
