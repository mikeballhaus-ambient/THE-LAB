import { z } from 'zod';
import { LabRuleConditionSchema } from '@/shared/types/schemas/lab-rule-schema';
import { LabWorkflowDefinitionV2Schema } from '@/shared/types/schemas/lab-workflow-graph-schema';
import { LabWorkflowStepSchema } from '@/shared/types/schemas/lab-workflow-step-schema';
import { migrateLabWorkflowDefinitionInput } from '@/shared/utils/lab-workflow-step-migrations';

export { LabWorkflowStepSchema };

export const LabWorkflowDefinitionV1Schema = z.object({
  schemaVersion: z.literal(1),
  trigger: z.object({
    eventType: z.string().min(1),
  }),
  conditions: z.array(LabRuleConditionSchema).optional(),
  steps: z.array(LabWorkflowStepSchema).min(1).max(15),
});

export const LabWorkflowDefinitionSchema = z.discriminatedUnion('schemaVersion', [
  LabWorkflowDefinitionV1Schema,
  LabWorkflowDefinitionV2Schema,
]);

export const LabWorkflowCreateSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    scope: z.enum(['global', 'user']),
    ownerUserId: z.number().int().positive().optional(),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(1).max(1000).default(100),
    definition: LabWorkflowDefinitionSchema,
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'global' && data.ownerUserId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Global workflows cannot have an owner',
        path: ['ownerUserId'],
      });
    }
    if (data.scope === 'user' && (data.ownerUserId == null || data.ownerUserId <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'User-scoped workflows must have a positive ownerUserId',
        path: ['ownerUserId'],
      });
    }
  });

export const LabWorkflowUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  definition: LabWorkflowDefinitionSchema.optional(),
});

export function parseLabWorkflowDefinition(input: unknown) {
  return LabWorkflowDefinitionSchema.parse(migrateLabWorkflowDefinitionInput(input));
}

export function parseLabWorkflowCreate(input: unknown) {
  return LabWorkflowCreateSchema.parse(input);
}

export function parseLabWorkflowUpdate(input: unknown) {
  return LabWorkflowUpdateSchema.parse(input);
}
