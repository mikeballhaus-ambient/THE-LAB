import { z } from 'zod';

export const LabApprovalPolicyStepSchema = z.object({
  label: z.string().optional(),
  assigneeUserId: z.number().int().positive(),
});

export const LabApprovalPolicyDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  steps: z.array(LabApprovalPolicyStepSchema).min(1).max(10),
});

export const LabApprovalPolicyCreateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  definition: LabApprovalPolicyDefinitionSchema,
});

export const LabApprovalPolicyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  definition: LabApprovalPolicyDefinitionSchema.optional(),
});

export const LabApprovalRequestCreateSchema = z.object({
  id: z.string().uuid(),
  policyId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  subjectAppId: z.string().min(1),
  subjectEntityType: z.string().min(1),
  subjectEntityId: z.string().min(1),
  notifyAssignees: z.boolean().default(true),
});

export const LabApprovalDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(2000).optional(),
});

export function parseLabApprovalPolicyDefinition(input: unknown) {
  return LabApprovalPolicyDefinitionSchema.parse(input);
}

export function parseLabApprovalPolicyCreate(input: unknown) {
  return LabApprovalPolicyCreateSchema.parse(input);
}

export function parseLabApprovalPolicyUpdate(input: unknown) {
  return LabApprovalPolicyUpdateSchema.parse(input);
}

export function parseLabApprovalRequestCreate(input: unknown) {
  return LabApprovalRequestCreateSchema.parse(input);
}

export function parseLabApprovalDecision(input: unknown) {
  return LabApprovalDecisionSchema.parse(input);
}
