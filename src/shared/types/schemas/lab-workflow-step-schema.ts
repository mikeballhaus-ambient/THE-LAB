import { z } from 'zod';
import { LabRuleConditionSchema } from '@/shared/types/schemas/lab-rule-schema';
import { LabNotificationActionsSchema } from '@/shared/types/schemas/lab-notification-action-schema';

/**
 * Copy overrides for a notification node (W4.3).
 *
 * Length-capped because these strings are stored in the graph and rendered into every recipient's
 * inbox: an unbounded template is a payload-size problem in a table nobody audits.
 */
export const LabWorkflowMessageTemplateSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
});

export const LabWorkflowStepSchema = z.discriminatedUnion('kind', [
  /*
   * In-app notification.
   *
   * Both recipient sources are optional **individually** and the pair is required **together**,
   * because "notify nobody" is the one configuration a save must not accept: an unfilled node would
   * otherwise report success on every run while reaching no one, which is indistinguishable from a
   * working workflow until someone complains about a missed notification.
   */
  z
    .object({
      kind: z.literal('notify_users'),
      userIds: z.array(z.number()).max(20),
      /** Payload path resolving to a user id **or** an email. */
      path: z.string().max(200).optional(),
      message: LabWorkflowMessageTemplateSchema.optional(),
      actions: LabNotificationActionsSchema.optional(),
    })
    .refine((value) => value.userIds.length > 0 || Boolean(value.path?.trim()), {
      message: 'Choose at least one lab user, or a payload field that identifies the recipient.',
      path: ['userIds'],
    }),
  z.object({
    kind: z.literal('publish_event'),
    type: z.string(),
    sourceAppId: z.string(),
    payloadMerge: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    kind: z.literal('rule_ref'),
    ruleId: z.string().uuid(),
  }),
  z.object({
    kind: z.literal('comms_system_dm_payload_user'),
    path: z.string().min(1),
    text: z.string().max(2000).optional(),
  }),
  z.object({
    kind: z.literal('integration_create'),
    providerAppId: z.string().min(1),
    serviceId: z.string().min(1),
    bodyFromPayload: z.record(z.string(), z.string()).optional(),
    body: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    kind: z.literal('integration_update'),
    providerAppId: z.string().min(1),
    serviceId: z.string().min(1),
    recordIdPath: z.string().min(1),
    bodyFromPayload: z.record(z.string(), z.string()).optional(),
    body: z.record(z.string(), z.unknown()).optional(),
  }),
  // A2 — Set / Edit fields: **shaping only**.
  //
  // Every source reads a value and writes it to a path; none of them read the path first. That is the
  // invariant that keeps this node predictable — an author mapping "payload → output schema" should
  // never have to reason about what was already there. Arithmetic belongs in `code`, which says so.
  //
  // Capped counts: a graph is user-authored data and every assignment is executed per item, so an
  // unbounded list is a cheap way to make a workflow slow.
  z.object({
    kind: z.literal('set_fields'),
    fields: z
      .array(
        z.object({
          path: z.string().min(1).max(200),
          source: z.enum(['literal', 'from_payload', 'template']),
          value: z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]),
        }),
      )
      .min(1)
      .max(50),
  }),
  // A2b — Code: the escape hatch for what declarative shaping cannot say.
  //
  // Deliberately narrow. The body is a **function expression** receiving the item array and returning
  // one, so there is no ambient `state`, no network, no imports — anything the platform owns stays
  // outside the sandbox, and "what does this node do" is answerable by reading one string.
  //
  // `source` is capped well below the payload caps because it is stored per node in the graph and
  // rendered by the designer; a megabyte of script is a payload problem, not a feature.
  z.object({
    kind: z.literal('code'),
    /** Function body, e.g. `(items) => items.map(i => ({ ...i, n: (i.n ?? 0) + 1 }))`. */
    source: z.string().min(1).max(20_000),
    /** Milliseconds before evaluation is abandoned. */
    timeoutMs: z.number().int().min(100).max(5_000).optional(),
  }),
  // A3 — Rename / remove.
  z.object({
    kind: z.literal('rename_fields'),
    renames: z
      .array(z.object({ from: z.string().min(1).max(200), to: z.string().min(1).max(200) }))
      .max(50)
      .optional(),
    remove: z.array(z.string().min(1).max(200)).max(50).optional(),
  }),
  // A4 — Date & time. `zone` is validated at runtime against IANA rather than here, because the
  // list of zones is not something the schema should pin: a fallback with a recorded warning is
  // better than rejecting a workflow saved before a zone was renamed.
  z.object({
    kind: z.literal('date_time'),
    operations: z
      .array(
        z.object({
          source: z.string().min(1).max(200),
          target: z.string().min(1).max(200).optional(),
          op: z.enum(['add', 'subtract', 'format']),
          amount: z.number().int().min(-10000).max(10000).optional(),
          unit: z
            .enum(['minutes', 'hours', 'days', 'weeks', 'months', 'years'])
            .optional(),
          output: z.string().max(200).optional(),
          zone: z.string().max(100).optional(),
        }),
      )
      .min(1)
      .max(20),
  }),
  // A5 — Filter. Same condition vocabulary as a rule node, minus the app-lookup kinds: a filter is
  // a pure per-item decision for every row, so an app call per row is rejected at save time rather
  // than becoming an accidental N+1 in a workflow.
  z.object({
    kind: z.literal('filter_items'),
    conditions: z
      .array(
        LabRuleConditionSchema.refine(
          (condition) =>
            condition.kind !== 'lookup_field_equals' && condition.kind !== 'lookup_field_exists',
          { message: 'Filter conditions must be payload-only (no app lookups).' },
        ),
      )
      .min(1)
      .max(20),
    combine: z.enum(['all', 'any']).optional(),
  }),
  // A6 — Sort / limit / dedupe.
  z.object({
    kind: z.literal('sort_items'),
    sort: z
      .array(
        z.object({
          path: z.string().min(1).max(200),
          direction: z.enum(['asc', 'desc']).optional(),
        }),
      )
      .max(10)
      .optional(),
    limit: z.number().int().min(0).max(10000).optional(),
    dedupeBy: z.string().min(1).max(200).optional(),
  }),
  // F1 — IF. Two outputs: port 0 (true) and port 1 (false).
  z.object({
    kind: z.literal('if_condition'),
    conditions: z.array(LabRuleConditionSchema).min(1).max(20),
    combine: z.enum(['all', 'any']).optional(),
  }),
  // F2 — Switch. Port N per routing, plus a fallback port at `routings.length` by default.
  z.object({
    kind: z.literal('switch_condition'),
    routings: z
      .array(
        z.object({
          label: z.string().max(80).optional(),
          conditions: z.array(LabRuleConditionSchema).min(1).max(20),
        }),
      )
      .min(1)
      .max(9),
    fallbackOutputIndex: z.number().int().min(0).max(9).optional(),
  }),
  // F6 — Split Out. One item's array field becomes many items.
  z.object({
    kind: z.literal('split_out'),
    path: z.string().min(1).max(200),
    includeOtherFields: z.boolean().optional(),
    targetPath: z.string().min(1).max(200).optional(),
  }),
  // F3 — Merge. The only step that reads several branches at once, so it is the only one whose
  // input is a list of item arrays rather than a single array.
  //
  // `keyPath` is optional *here* even though `by_key` requires it: a `.refine()` on the object would
  // turn the member into a `ZodEffects`, and this is a `discriminatedUnion`, whose members must stay
  // `ZodObject`. Cross-field rules therefore live in `validateWorkflowDefinition` (gate G3), which is
  // also where the user-facing message belongs.
  z.object({
    kind: z.literal('merge_items'),
    mode: z.enum(['append', 'by_index', 'by_key']),
    keyPath: z.string().min(1).max(200).optional(),
    includeUnpaired: z.boolean().optional(),
  }),
  // W8b — Wait. Capped at 30 days: an unbounded wait is a workflow nobody will remember exists, and
  // its run row sits in the history looking "running" forever.
  // `seconds` is capped separately (300) so a short pause cannot be expressed as a huge number of
  // them; it is honoured in-process rather than resuming on the clock.
  z
    .object({
      kind: z.literal('wait'),
      amount: z.number().int().min(1).max(300),
      unit: z.enum(['seconds', 'minutes', 'hours', 'days']),
    })
    .refine((value) => value.unit === 'seconds' || value.amount <= 30, {
      message: 'A wait in minutes, hours or days is capped at 30.',
      path: ['amount'],
    }),
  // L1b — bounded loop. `maxIterations` is required and capped: an uncapped loop is a hang, and this
  // node is the one place the graph may re-enter itself.
  z.object({
    kind: z.literal('loop'),
    maxIterations: z.number().int().min(1).max(100),
    while: z.array(LabRuleConditionSchema).max(20).optional(),
  }),
  // L1 — read a catalog app.
  z.object({
    kind: z.literal('lab_query_app'),
    providerAppId: z.string().min(1).max(120),
    serviceId: z.string().min(1).max(120),
    recordIdPath: z.string().min(1).max(200).optional(),
  }),
  // L2 — delete a catalog record. Destructive, so the id path is mandatory: a delete with no target
  // would otherwise resolve to `undefined` per item and either no-op silently or fail oddly.
  z.object({
    kind: z.literal('integration_delete'),
    providerAppId: z.string().min(1).max(120),
    serviceId: z.string().min(1).max(120),
    recordIdPath: z.string().min(1).max(200),
  }),
  // L4 — raise an approval.
  z.object({
    kind: z.literal('raise_approval'),
    policyId: z.string().uuid(),
    title: z.string().min(1).max(200),
    titlePath: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    descriptionPath: z.string().max(200).optional(),
    subjectAppId: z.string().max(120).optional(),
    subjectEntityType: z.string().max(120).optional(),
    subjectEntityTypePath: z.string().max(200).optional(),
    subjectEntityIdPath: z.string().max(200).optional(),
  }),
  // L5 — post a balanced ledger entry. `confirmedByUserId` is required, not optional: the owner's
  // rule is that money must be deliberate, and an event-triggered workflow has no human behind it.
  z.object({
    kind: z.literal('ledger_post_entry'),
    memo: z.string().min(1).max(500),
    memoPath: z.string().max(200).optional(),
    lines: z
      .array(
        z.object({
          accountId: z.string().uuid(),
          side: z.enum(['debit', 'credit']),
          amountCentsPath: z.string().min(1).max(200),
        }),
      )
      .min(2)
      .max(20),
    confirmedByUserId: z.number().int().positive(),
  }),
  // W10b — outbound HTTP. The URL is not pattern-checked here beyond being non-empty: a template
  // reference is not a URL until run time, so shape validation belongs to `validateOutboundUrl` at
  // the request. A regex here would reject the legitimate templated case.
  z.object({
    kind: z.literal('http_request'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    url: z.string().min(1).max(2000),
    headers: z.record(z.string().max(120), z.string().max(2000)).optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    bodyFromPayload: z.record(z.string(), z.string()).optional(),
    replaceItems: z.boolean().optional(),
    timeoutMs: z.number().int().min(1000).max(30_000).optional(),
    allowList: z.array(z.string().min(1).max(253)).max(20).optional(),
  }),
]);
