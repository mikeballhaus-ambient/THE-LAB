/**
 * @see plans/rm-59-rules-engine/architecture.md
 */

/**
 * Comparison operators available on a payload field.
 *
 * ## Why these are separate kinds, not a `comparator` field on `payload_equals`
 *
 * The condition union is already discriminated on `kind` and every switch over it is exhaustive —
 * evaluator, canvas summary, rule summary, condition editor. Adding `comparator` to `payload_equals`
 * would leave `kind` describing the *field*, not the *test*, so each site would need a nested branch
 * and an unknown comparator would fall through silently as "equals". A new kind per operator keeps
 * the compiler honest: any switch that misses one fails to type-check.
 *
 * `payload_equals` is kept as its own kind (rather than aliased to `payload_eq`) because it is
 * persisted in existing rules, demo seeds and snapshots. Renaming it would need a migration to gain
 * nothing.
 */
export type LabRuleConditionV1 =
  | { kind: 'payload_equals'; path: string; value: string | number | boolean | null }
  | { kind: 'payload_not_equals'; path: string; value: string | number | boolean | null }
  /** Numeric or date ordering. `value` is a number or an ISO date string. */
  | { kind: 'payload_greater_than'; path: string; value: string | number }
  | { kind: 'payload_greater_or_equal'; path: string; value: string | number }
  | { kind: 'payload_less_than'; path: string; value: string | number }
  | { kind: 'payload_less_or_equal'; path: string; value: string | number }
  /** Substring test, case-insensitive. Never valid on a number/boolean/date field. */
  | { kind: 'payload_contains'; path: string; value: string }
  | { kind: 'payload_not_contains'; path: string; value: string }
  /** Matches when the *field* is empty/missing — the negation of `payload_exists`. */
  | { kind: 'payload_missing'; path: string }
  | { kind: 'payload_exists'; path: string }
  | {
      kind: 'lookup_field_equals';
      providerAppId: string;
      serviceId: string;
      recordIdPath: string;
      field: string;
      value: string | number | boolean | null;
    }
  | {
      kind: 'lookup_field_exists';
      providerAppId: string;
      serviceId: string;
      recordIdPath: string;
      field: string;
    };

/** Used by Workflow Studio step definitions — not stored on rules. */
export type LabRuleActionV1 =
  | { kind: 'notify_users'; userIds: number[]; path?: string }
  | {
      kind: 'publish_event';
      type: string;
      sourceAppId: string;
      payloadMerge?: Record<string, unknown>;
    };

export const LAB_RULE_DEFINITION_SCHEMA_VERSION = 2;

export interface LabRuleDefinitionV1 {
  schemaVersion: typeof LAB_RULE_DEFINITION_SCHEMA_VERSION;
  trigger: { eventTypes: string[] };
  conditions?: LabRuleConditionV1[];
}

export type LabRuleScope = 'global' | 'user';

export interface LabRuleRecord {
  id: string;
  name: string;
  description?: string;
  scope: LabRuleScope;
  /** NULL when scope is global */
  ownerUserId: number | null;
  createdByUserId: number;
  enabled: boolean;
  priority: number;
  definition: LabRuleDefinitionV1;
  createdAt: string;
  updatedAt: string;
}
