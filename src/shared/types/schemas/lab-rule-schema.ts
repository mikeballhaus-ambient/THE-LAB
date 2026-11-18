import { z } from 'zod';

/**
 * Zod schemas for LabRule types
 */

/*
 * One entry per operator, kept in lockstep with `LabRuleConditionV1`. Ordering kinds restrict
 * `value` to string|number: a boolean has no meaningful "greater than", and accepting one here would
 * store a condition the evaluator can only interpret by guesswork.
 */
export const LabRuleConditionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('payload_equals'),
    path: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
  z.object({
    kind: z.literal('payload_not_equals'),
    path: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
  z.object({
    kind: z.literal('payload_greater_than'),
    path: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
  z.object({
    kind: z.literal('payload_greater_or_equal'),
    path: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
  z.object({
    kind: z.literal('payload_less_than'),
    path: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
  z.object({
    kind: z.literal('payload_less_or_equal'),
    path: z.string(),
    value: z.union([z.string(), z.number()]),
  }),
  z.object({
    kind: z.literal('payload_contains'),
    path: z.string(),
    value: z.string(),
  }),
  z.object({
    kind: z.literal('payload_not_contains'),
    path: z.string(),
    value: z.string(),
  }),
  z.object({
    kind: z.literal('payload_missing'),
    path: z.string(),
  }),
  z.object({
    kind: z.literal('payload_exists'),
    path: z.string(),
  }),
  z.object({
    kind: z.literal('lookup_field_equals'),
    providerAppId: z.string().min(1),
    serviceId: z.string().min(1),
    recordIdPath: z.string().min(1),
    field: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
  z.object({
    kind: z.literal('lookup_field_exists'),
    providerAppId: z.string().min(1),
    serviceId: z.string().min(1),
    recordIdPath: z.string().min(1),
    field: z.string().min(1),
  }),
]);

const LabRuleTriggerSchema = z
  .object({
    eventType: z.string().min(1).optional(),
    eventTypes: z.array(z.string().min(1)).max(25).optional(),
  })
  .superRefine((trigger, ctx) => {
    const hasTypes = (trigger.eventTypes?.length ?? 0) > 0;
    const hasLegacy = Boolean(trigger.eventType?.trim());
    if (!hasTypes && !hasLegacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one trigger event is required',
        path: ['eventTypes'],
      });
    }
  })
  .transform((trigger) => ({
    eventTypes: trigger.eventTypes?.length
      ? [...new Set(trigger.eventTypes.map((t) => t.trim()).filter(Boolean))]
      : [trigger.eventType!.trim()],
  }));

const LabRuleDefinitionBodySchema = z.object({
  schemaVersion: z.literal(2),
  trigger: LabRuleTriggerSchema,
  conditions: z.array(LabRuleConditionSchema).optional(),
});

function migrateRuleDefinitionInput(input: unknown): unknown {
  if (typeof input !== 'object' || input == null) {
    return input;
  }
  const raw = input as Record<string, unknown>;
  const version = raw.schemaVersion;
  if (version === 1) {
    const { actions, ...rest } = raw;
    void actions;
    return { ...rest, schemaVersion: 2 };
  }
  return input;
}

export const LabRuleDefinitionSchema = z.preprocess(
  migrateRuleDefinitionInput,
  LabRuleDefinitionBodySchema,
);

export type LabRuleCondition = z.infer<typeof LabRuleConditionSchema>;
export type LabRuleDefinition = z.infer<typeof LabRuleDefinitionSchema>;

/**
 * Create schema - includes id, name, description?, scope, ownerUserId (optional), enabled, priority, definition
 */
export const LabRuleCreateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    scope: z.enum(['global', 'user']),
    ownerUserId: z.number().int().positive().optional(),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(1).max(1000).default(100),
    definition: LabRuleDefinitionSchema,
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'global' && data.ownerUserId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Global rules cannot have an owner',
        path: ['ownerUserId'],
      });
    }
    if (data.scope === 'user' && (data.ownerUserId == null || data.ownerUserId <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'User-scoped rules must have a positive ownerUserId',
        path: ['ownerUserId'],
      });
    }
  });

/**
 * Update schema - partial without id; members cannot send scope / ownerUserId
 */
export const LabRuleUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  definition: LabRuleDefinitionSchema.optional(),
});

/**
 * Parse helpers
 */
export function parseLabRuleDefinition(input: unknown): LabRuleDefinition {
  return LabRuleDefinitionSchema.parse(input);
}

export function parseLabRuleCreate(input: unknown): z.infer<typeof LabRuleCreateSchema> {
  return LabRuleCreateSchema.parse(input);
}

export function parseLabRuleUpdate(input: unknown): z.infer<typeof LabRuleUpdateSchema> {
  return LabRuleUpdateSchema.parse(input);
}
