/**
 * @see plans/rm-60-workflow-studio/architecture.md
 */
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabNotificationAction } from '@/shared/types/lab-notification-action';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

export const LAB_WORKFLOW_DEFINITION_SCHEMA_VERSION = 1;

/**
 * Optional copy overrides for a notification node (W4.3).
 *
 * Both strings support `{{payload.some.path}}` references resolved against the payload of the item
 * the node is acting on. The reason this belongs on the *step* rather than in a global template is
 * that the same event means different things in different workflows: "task created" is "a new task
 * was assigned to you" for the assignee and "you have a new task to review" for the reviewer.
 *
 * An unresolved reference renders as an empty string rather than the literal `{{…}}`, because a
 * half-substituted message is worse than a slightly terse one — see `renderWorkflowMessageTemplate`.
 */
export interface LabWorkflowMessageTemplate {
  title?: string;
  body?: string;
}

/**
 * Declarative data nodes (A2–A6).
 *
 * These are the nodes that make the product usable **without** a Code node: the owner's constraint
 * is that business users, not developers, are the authors, and "map this field, drop that row" is
 * the work they actually need. They transform the item array and nothing else, so they have no
 * `dryRun` branch — there is no side effect to describe instead of performing.
 */
export type LabWorkflowDataStepV1 =
  /**
   * A2 — **shape** the item by writing fields.
   *
   * Shaping only: every source reads a value and writes it to `path`. None reads `path` first, so an
   * author building an output schema never has to reason about what was already there. Arithmetic is
   * a mutation, not shaping, and lives in `code` — which admits it.
   */
  | {
      kind: 'set_fields';
      fields: {
        path: string;
        /** `literal` writes `value`; `from_payload` reads `value` as a path; `template` renders it. */
        source: 'literal' | 'from_payload' | 'template';
        value: string | number | boolean | null;
      }[];
    }
  /**
   * A2b — evaluate a function over the item array.
   *
   * The declarative nodes cover the mapping work; this exists for the residue they cannot express
   * (arithmetic on a value, string surgery, conditional reshaping across items). `source` is a
   * function expression, evaluated with no ambient state and no I/O: it receives the items and
   * returns items, which is the whole contract.
   */
  | {
      kind: 'code';
      source: string;
      /** Milliseconds before evaluation is abandoned. */
      timeoutMs?: number;
    }
  /** A3 — reshape keys: rename some, drop others. */
  | {
      kind: 'rename_fields';
      renames?: { from: string; to: string }[];
      remove?: string[];
    }
  /** A4 — date arithmetic and formatting in a named IANA zone. */
  | {
      kind: 'date_time';
      operations: {
        source: string;
        target?: string;
        op: 'add' | 'subtract' | 'format';
        amount?: number;
        unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
        output?: string;
        zone?: string;
      }[];
    }
  /** A5 — drop items by condition. `lookup_field_*` is not allowed: it needs an app call. */
  | {
      kind: 'filter_items';
      conditions: LabRuleConditionV1[];
      combine?: 'all' | 'any';
    }
  /** A6 — list hygiene, applied once over the whole array. */
  | {
      kind: 'sort_items';
      sort?: { path: string; direction?: 'asc' | 'desc' }[];
      limit?: number;
      dedupeBy?: string;
    };

/**
 * Routing nodes (W7).
 *
 * These are the nodes that emit on **different ports**, which is what makes `LabWorkflowNodeOutput
 * .outputIndex` meaningful: an IF sends its items out of port 0 (true) or 1 (false), a Switch out of
 * the matched rule's port and a configurable fallback port.
 *
 * `on_true` / `on_false` edges still work on an IF for graphs authored before ports existed; the
 * evaluator treats a pre-existing `on_true` edge as port 0 and `on_false` as port 1, so nothing needs
 * migrating.
 */
export type LabWorkflowRoutingStepV1 =
  /** F1 — two outputs by condition. */
  | {
      kind: 'if_condition';
      conditions: LabRuleConditionV1[];
      combine?: 'all' | 'any';
    }
  /** F2 — N outputs, one per rule, plus a fallback for no match. */
  | {
      kind: 'switch_condition';
      routings: { label?: string; conditions: LabRuleConditionV1[] }[];
      /** Port taken when no routing matches. Defaults to `routings.length`. */
      fallbackOutputIndex?: number;
    }
  /** F6 — one item's array field becomes many items. */
  | {
      kind: 'split_out';
      /** Path on the item holding the array to expand. */
      path: string;
      /** Keep the other fields alongside the expanded value. Defaults to true. */
      includeOtherFields?: boolean;
      /** Write the expanded element to this path instead of replacing the item. */
      targetPath?: string;
    };

/**
 * Combining nodes (W7b).
 *
 * The distinguishing property is that these read **more than one incoming branch at once**. Every
 * other node kind is a function of a single item array, which is why the walker could stay a
 * depth-first walk until Merge existed. `merge_items` therefore receives its input as a list of
 * branch arrays, not as one array: appending three branches is not the same as mapping over the
 * concatenation, and by-index pairing is not expressible over a flattened list at all.
 */
export type LabWorkflowCombineStepV1 =
  /** F3 — join two or more branches. */
  | {
      kind: 'merge_items';
      /**
       * `append` concatenates the branches in edge order. `by_index` pairs row *i* of every branch.
       * `by_key` joins the first branch (the base) to each later branch on `keyPath`.
       */
      mode: 'append' | 'by_index' | 'by_key';
      /** Required for `by_key`; enforced by the shared validator, not by the schema. */
      keyPath?: string;
      /**
       * Keep rows that found no partner (a left join). Defaults to false — an inner join — with the
       * unmatched count reported in `detail` so a join that matched nothing is visible in the run
       * panel instead of looking like an empty success.
       */
      includeUnpaired?: boolean;
    };

/**
 * Pacing (W8b).
 *
 * `wait` suspends a run for a fixed span. It is a **step**, not a trigger, because the useful case is
 * "notify now, then remind in three days" inside one graph — splitting that into two workflows means
 * the second one cannot see the first one's items.
 *
 * The pause is recorded on the run rather than held open in memory: a backend restart must not lose a
 * half-finished run. What resumes it is the same platform clock that fires schedules, which is why
 * this lives in the W8 phase and not earlier.
 */
export type LabWorkflowPacingStepV1 =
  | {
      kind: 'wait';
      /** Wait this long. Bounded by the schema; a workflow is user-authored data. */
      amount: number;
      /**
       * `seconds` exists for the loop demo (a 3 s pause is watchable); `minutes`+ are durable and
       * resume on the platform clock. Short waits are honoured in-process, which means a restart
       * mid-wait loses that pause — acceptable for a delay measured in seconds.
       */
      unit: 'seconds' | 'minutes' | 'hours' | 'days';
    };

/**
 * L1 — bounded loop (iteration).
 *
 * Two outputs, not three. `body` runs while the loop may continue, `done` fires when it stops. That
 * exhaust-vs-complete distinction rides on the `done` item as `loopExhausted: true`, rather than
 * being a third port: a `break` port would race `done` and leave the evaluator choosing a winner.
 *
 * This is the only node kind that re-enters itself. The walker's per-run `pathVisited` guard is
 * bypassed for a loop's `body` port and replaced by `maxIterations`, which is what bounds the graph.
 */
export type LabWorkflowLoopStepV1 = {
  kind: 'loop';
  /**
   * Hard cap on body executions. Required: an uncapped loop in a user-authored graph is a hang, and
   * the loop's whole purpose here is to be bounded. Reaching it sets `loopExhausted`.
   */
  maxIterations: number;
  /** Optional continue test, evaluated against the item between iterations. Omit to run the cap. */
  while?: LabRuleConditionV1[];
};

/**
 * Platform nodes (W9).
 *
 * These are the nodes that let a workflow act on **the lab itself** rather than on an external app:
 * read a catalog app, raise an approval, post to the ledger. They are separate from
 * `integration_*` because they call a platform service in-process, not a connector over HTTP — the
 * failure modes, the actor resolution and the audit trail are all different.
 *
 * Money is the exception that needs care: `ledger_post_entry` requires an explicit confirmation
 * (`confirmedByUserId`) and leaves the audit trail in the ledger's own `created_by_user_id`. The
 * owner's decision was that money movement must be deliberate, so an unconfirmed entry is refused
 * rather than posted and logged.
 */
export type LabWorkflowPlatformStepV1 =
  /** L1 — read a catalog app through its discovery contract. */
  | {
      kind: 'lab_query_app';
      providerAppId: string;
      serviceId: string;
      /** Optional payload path holding a record id; omit to list. */
      recordIdPath?: string;
    }
  /** L2 — create a record in a catalog app (delete is `integration_delete`). */
  | {
      kind: 'integration_delete';
      providerAppId: string;
      serviceId: string;
      /** Payload path holding the id of the record to delete. */
      recordIdPath: string;
    }
  /** L4 — raise an approval request against a policy. */
  | {
      kind: 'raise_approval';
      policyId: string;
      title: string;
      titlePath?: string;
      description?: string;
      descriptionPath?: string;
      subjectAppId?: string;
      subjectEntityType?: string;
      subjectEntityTypePath?: string;
      subjectEntityIdPath?: string;
    }
  /** L5 — post a balanced ledger entry. Never runs unconfirmed. */
  | {
      kind: 'ledger_post_entry';
      memo: string;
      /** When set, journal memo comes from this payload path (falls back to `memo`). */
      memoPath?: string;
      lines: {
        accountId: string;
        side: 'debit' | 'credit';
        /** Path on the item holding the amount, in minor units. */
        amountCentsPath: string;
      }[];
      /**
       * The user who authorised a money movement. Required by the schema: a ledger node in an
       * event-triggered workflow has no human behind it, so the author must name one explicitly.
       */
      confirmedByUserId: number;
    };

/**
 * Outbound HTTP (W10b).
 *
 * The most powerful node in the catalogue and therefore the most constrained. `url` may reference a
 * payload field, which is exactly the shape an SSRF attack needs, so the URL is validated at the
 * **request**, every redirect hop is re-validated, and the response is size-capped.
 *
 * Credentials are not stored here. A `credentialId` would name a row in a credential store; that
 * store does not exist yet, so the node has no auth field rather than a half-built one that implies
 * a security property it does not have.
 */
export type LabWorkflowHttpStepV1 =
  | {
      kind: 'http_request';
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      /** Absolute URL. Supports `{{payload.path}}` references. */
      url: string;
      /** Headers; values support the same references. */
      headers?: Record<string, string>;
      /** JSON body, sent for POST/PUT/PATCH. Supports references in string values. */
      body?: Record<string, unknown>;
      /** Map JSON keys to event field paths (same `payload.*` convention as integration writes). */
      bodyFromPayload?: Record<string, string>;
      /** Replace the item with the parsed response. Defaults to false (attach it). */
      replaceItems?: boolean;
      /** Milliseconds before the request is abandoned. Capped by the schema. */
      timeoutMs?: number;
      /**
       * Hosts this node may reach. Non-empty means only those; empty/absent means any public host.
       * The platform-level list is applied as well, so this can narrow but never widen.
       */
      allowList?: string[];
    };

export type LabWorkflowStepV1 =
  | LabWorkflowDataStepV1
  | LabWorkflowRoutingStepV1
  | LabWorkflowLoopStepV1
  | LabWorkflowCombineStepV1
  | LabWorkflowPacingStepV1
  | LabWorkflowPlatformStepV1
  | LabWorkflowHttpStepV1
  /**
   * In-app bell notification.
   *
   * Two ways to name the recipients, and at least one must be set:
   * - `userIds` — a fixed list chosen in the designer.
   * - `path` — **either** a user id or an email, read from the event payload (or the current item).
   *
   * `path` exists because the two useful sources disagree on identity: a Task List event carries an
   * `assigneeId` number while a connector row or webhook body usually carries an email. Making the
   * author `set_fields` one into the other is a step whose only job is to misdescribe the payload.
   */
  | {
      kind: 'notify_users';
      userIds: number[];
      path?: string;
      message?: LabWorkflowMessageTemplate;
      actions?: LabNotificationAction[];
    }
  | {
      kind: 'publish_event';
      type: string;
      sourceAppId: string;
      payloadMerge?: Record<string, unknown>;
    }
  | { kind: 'rule_ref'; ruleId: string }
  /**
   * Lab Messages direct message from the THE-LAB system user.
   *
   * `path` resolves to **either** a user id or an email — see `resolvePayloadRecipient`. An email is
   * looked up case-insensitively, because the address usually arrives from a third-party payload.
   */
  | { kind: 'comms_system_dm_payload_user'; path: string; text?: string }
  | {
      kind: 'integration_create';
      providerAppId: string;
      serviceId: string;
      bodyFromPayload?: Record<string, string>;
      body?: Record<string, unknown>;
    }
  | {
      kind: 'integration_update';
      providerAppId: string;
      serviceId: string;
      recordIdPath: string;
      bodyFromPayload?: Record<string, string>;
      body?: Record<string, unknown>;
    };

export interface LabWorkflowDefinitionV1 {
  schemaVersion: typeof LAB_WORKFLOW_DEFINITION_SCHEMA_VERSION;
  trigger: { eventType: string };
  conditions?: LabRuleConditionV1[];
  steps: LabWorkflowStepV1[];
}

export type LabWorkflowScope = 'global' | 'user';

export type { LabWorkflowDefinitionV2 };

export type LabWorkflowDefinition = LabWorkflowDefinitionV1 | LabWorkflowDefinitionV2;

export interface LabWorkflowRecord {
  id: string;
  name: string;
  description?: string;
  scope: LabWorkflowScope;
  ownerUserId: number | null;
  createdByUserId: number;
  enabled: boolean;
  priority: number;
  definition: LabWorkflowDefinition;
  createdAt: string;
  updatedAt: string;
}
