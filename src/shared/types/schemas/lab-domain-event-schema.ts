import { z } from 'zod';

export const LabDomainEventPublishSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  type: z.string().min(1),
  sourceAppId: z.string().min(1),
  occurredAt: z.iso.datetime(),
  actorUserId: z.number().int().positive().optional(),
  payload: z.record(z.string(), z.unknown()),
});

export type LabDomainEventPublishInput = z.infer<typeof LabDomainEventPublishSchema>;

export function parseLabDomainEventPublish(input: unknown): LabDomainEventPublishInput {
  return LabDomainEventPublishSchema.parse(input);
}
