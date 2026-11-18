import { z } from 'zod';
import { LAB_INTEGRATION_KINDS } from '../lab-integrations';

const IntegrationKindSchema = z.enum(LAB_INTEGRATION_KINDS);

export const LabIntegrationPlacementSchema = z.object({
  surfaceId: z.string().min(1).optional(),
  regionId: z.string().min(1),
  order: z.number().int().optional(),
  presentation: z.enum(['inline', 'dialog']).optional(),
  hideButtons: z.boolean().optional(),
});

export const LabIntegrationBindingConfigSchema = z.object({
  schemaVersion: z.literal(1),
  serviceId: z.string().min(1).optional(),
  placement: LabIntegrationPlacementSchema.optional(),
  filterMap: z.record(z.string(), z.string()).optional(),
});

export const LabIntegrationBindingCreateSchema = z.object({
  id: z.string().uuid().optional(),
  hostAppId: z.string().min(1),
  slot: z.string().min(1),
  kind: IntegrationKindSchema,
  providerAppId: z.string().min(1),
  providerRef: z.string().min(1),
  config: LabIntegrationBindingConfigSchema.default({ schemaVersion: 1 }),
  enabled: z.boolean().default(true),
});

export const LabIntegrationBindingUpdateSchema = z.object({
  providerAppId: z.string().min(1).optional(),
  providerRef: z.string().min(1).optional(),
  config: LabIntegrationBindingConfigSchema.optional(),
  enabled: z.boolean().optional(),
});

export function parseLabIntegrationBindingCreate(input: unknown) {
  return LabIntegrationBindingCreateSchema.parse(input);
}

export function parseLabIntegrationBindingUpdate(input: unknown) {
  return LabIntegrationBindingUpdateSchema.parse(input);
}
