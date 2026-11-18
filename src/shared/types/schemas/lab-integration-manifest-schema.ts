import { z } from 'zod';
import { LAB_INTEGRATION_KINDS } from '../lab-integrations';

const IntegrationKindSchema = z.enum(LAB_INTEGRATION_KINDS);

const IntegrationServiceDescriptorSchema = z.object({
  serviceId: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  tier: z.enum(['domain', 'table', 'platform']),
  entityName: z.string().min(1),
  capabilities: z.array(z.enum(['CRUD', 'Lookups', 'Search', 'Batch'])),
  connector: z.object({
    segment: z.string().min(1),
    discoveryPath: z.string().optional(),
  }),
  integration: z
    .object({
      requiresHostAppId: z.boolean().optional(),
      contextKeys: z.array(z.string()).optional(),
      formSlots: z.array(z.string()).optional(),
    })
    .optional(),
  properties: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']),
      label: z.string().optional(),
      hidden: z.boolean().optional(),
      required: z.boolean().optional(),
      dateOnly: z.boolean().optional(),
    }),
  ),
  primaryKeyType: z.enum(['string', 'number']),
  tableName: z.string().optional(),
});

export const AppLabIntegrationManifestSchema = z.object({
  schemaVersion: z.literal(1),
  integrationServices: z.array(IntegrationServiceDescriptorSchema).optional(),
  offers: z
    .array(
      z.object({
        kind: IntegrationKindSchema,
        offerId: z.string(),
        label: z.string(),
        description: z.string().optional(),
        refSource: z.enum(['registry-only', 'provider-api']),
        providerApi: z
          .object({
            path: z.string(),
            refField: z.string(),
            labelField: z.string(),
          })
          .optional(),
      }),
    )
    .optional(),
  accepts: z
    .array(
      z.object({
        kind: IntegrationKindSchema,
        slot: z.string(),
        label: z.string(),
        contextKeys: z.array(z.string()).optional(),
        requiresServiceId: z.string().optional(),
        regionId: z.string().optional(),
        defaultPresentation: z.enum(['inline', 'dialog']).optional(),
      }),
    )
    .optional(),
  integrationSurfaces: z
    .array(
      z.object({
        surfaceId: z.string(),
        label: z.string(),
        regions: z.array(
          z.object({
            regionId: z.string(),
            label: z.string(),
            kinds: z.array(IntegrationKindSchema),
            layout: z.enum(['stack', 'grid']).optional(),
            defaultPresentation: z.enum(['inline', 'dialog']).optional(),
            hideButtons: z.boolean().optional(),
          }),
        ),
      }),
    )
    .optional(),
});

export function parseAppLabIntegrationManifest(input: unknown) {
  return AppLabIntegrationManifestSchema.parse(input);
}
