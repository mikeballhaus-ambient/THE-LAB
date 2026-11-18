import { z } from 'zod';

const CrmManifestEntitySourceSchema = z.object({
  entityKey: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  properties: z.array(
    z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      label: z.string().min(1),
      required: z.boolean().optional(),
      options: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .optional(),
      lookupEntityKey: z.string().optional(),
      lookupLabelProperty: z.string().optional(),
      validation: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

export const CrmIntegrationSyncRequestSchema = z.object({
  entities: z.array(CrmManifestEntitySourceSchema).min(1),
  provisionEntityKeys: z.array(z.string().min(1)).optional(),
  removeEntityKeys: z.array(z.string().min(1)).optional(),
});

export type CrmIntegrationSyncRequest = z.infer<typeof CrmIntegrationSyncRequestSchema>;

export function parseCrmIntegrationSyncRequest(input: unknown): CrmIntegrationSyncRequest {
  return CrmIntegrationSyncRequestSchema.parse(input);
}

export interface CrmEntityIntegrationSyncResult {
  manifestUpdated: boolean;
  provisioned: Array<{ entityKey: string; slot: string; formKey: string; bindingId?: string }>;
  removed: Array<{ entityKey: string; slot: string; bindingId: string }>;
}
