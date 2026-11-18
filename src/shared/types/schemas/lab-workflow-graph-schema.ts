import { z } from 'zod';
import { LabRuleConditionSchema } from '@/shared/types/schemas/lab-rule-schema';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const LabWorkflowEdgeWhenSchema = z.enum([
  'always',
  'on_match',
  'on_no_match',
  'on_true',
  'on_false',
]);

export const LabWorkflowGraphEdgeSchema = z.object({
  id: z.string().uuid(),
  source: z.string().uuid(),
  target: z.string().uuid(),
  when: LabWorkflowEdgeWhenSchema,
  /** Port leaving a routing node (W7). Absent on every edge authored before routing existed. */
  outputIndex: z.number().int().min(0).max(9).optional(),
  label: z.string().max(120).optional(),
});

/**
 * Authored schedule on a trigger node (phase 34).
 *
 * Zone validity and expression parseability are checked by
 * [`validateWorkflowDefinition`](../../../utils/validate-lab-workflow-definition.ts), not here: a
 * `.refine()` on a discriminated-union member breaks the union, and a shape error would report the
 * whole node as malformed instead of naming the schedule.
 */
export const LabWorkflowTriggerScheduleSchema = z.object({
  kind: z.enum(['cron', 'interval', 'recurrence']),
  expression: z.string().max(500).optional(),
  timezone: z.string().min(1).max(80),
  // Deliberately not `.int()`: a sub-minute interval is **typeable** (and warned about at 60 s) so
  // the author sees the floor rather than being unable to express what they meant. The tick still
  // enforces the real floor at run time.
  intervalMinutes: z.number().positive().max(525_600).optional(),
});

export const LabWorkflowGraphNodeSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().uuid(),
    kind: z.literal('trigger'),
    position: PositionSchema,
    eventType: z.string().min(1),
    schedule: LabWorkflowTriggerScheduleSchema.optional(),
    // Output mapping for a dynamic-payload trigger (phase 37). Absent = pass the payload through,
    // which is every pre-37 graph. A duplicate `to` is rejected by the validator, not here, because
    // the message needs to name the node.
    mapping: z
      .array(
        z.object({
          from: z.string().min(1).max(200),
          to: z.string().min(1).max(200),
        }),
      )
      .max(100)
      .optional(),
  }),
  z.object({
    id: z.string().uuid(),
    kind: z.literal('condition'),
    position: PositionSchema,
    conditions: z.array(LabRuleConditionSchema).min(1).max(20),
  }),
  z.object({
    id: z.string().uuid(),
    kind: z.literal('rule'),
    position: PositionSchema,
    groupId: z.string().uuid().optional(),
    name: z.string().min(1).max(120).optional(),
    conditions: z.array(LabRuleConditionSchema).max(20).optional(),
    ruleId: z.string().min(1).optional(),
  }),
  z.object({
    id: z.string().uuid(),
    kind: z.literal('action'),
    position: PositionSchema,
    groupId: z.string().uuid().optional(),
    step: LabWorkflowStepSchema,
  }),
  z.object({
    id: z.string().uuid(),
    kind: z.literal('group'),
    position: PositionSchema,
    label: z.string().min(1).max(80),
    width: z.number().min(160).max(800).optional(),
    height: z.number().min(120).max(600).optional(),
    groupType: z.enum(['actions', 'rules']).optional(),
    executionMode: z.enum(['sequential', 'parallel']).optional(),
    failurePolicy: z.enum(['stop', 'continue']).optional(),
    ruleCombine: z.enum(['sequential_first_match', 'all_match', 'any_match']).optional(),
    continueOnNoMatch: z.boolean().optional(),
  }),
]);

export const LabWorkflowDefinitionV2Schema = z.object({
  schemaVersion: z.literal(2),
  nodes: z.array(LabWorkflowGraphNodeSchema).min(1).max(40),
  edges: z.array(LabWorkflowGraphEdgeSchema).max(60),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number().min(0.2).max(2),
    })
    .optional(),
});
