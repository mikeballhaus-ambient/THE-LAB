import { z } from 'zod';
import { LAB_INTEGRATION_KINDS } from '../lab-integrations';
import {
  LabIntegrationBindingConfigSchema,
  LabIntegrationBindingCreateSchema,
  LabIntegrationBindingUpdateSchema,
} from './lab-integrations-schema';
import {
  ProvisionChartStubRequestSchema,
  ProvisionFormStubRequestSchema,
} from './lab-integrations-stub-schema';

const userIdField = z
  .number()
  .describe('REQUIRED. Platform user id from system instructions {{USERID}} context.');

export const labIntegrationsListBindingsSchemaFields = z.object({
  userId: userIdField,
  hostAppId: z.string().min(1),
});

export const labIntegrationsUpsertBindingSchemaFields = z.object({
  userId: userIdField,
  bindingId: z.string().uuid().optional().describe('When set, updates an existing binding'),
  hostAppId: z.string().min(1).optional(),
  slot: z.string().min(1).optional(),
  kind: z.enum(LAB_INTEGRATION_KINDS).optional(),
  providerAppId: z.string().min(1).optional(),
  providerRef: z.string().min(1).optional(),
  config: LabIntegrationBindingConfigSchema.optional(),
  enabled: z.boolean().optional(),
  presentation: z
    .enum(['inline', 'dialog'])
    .optional()
    .describe('How the host renders this form binding: inline panel vs modal dialog'),
  placementRegionId: z
    .string()
    .min(1)
    .optional()
    .describe('Host surface regionId (required with presentation / order / placementSurfaceId)'),
  placementSurfaceId: z.string().min(1).optional().describe('Host integrationSurfaces surfaceId'),
  placementOrder: z.number().int().optional().describe('Sort order within the region'),
});

export const labIntegrationsDeleteBindingSchemaFields = z.object({
  userId: userIdField,
  bindingId: z.string().uuid(),
});

export const labIntegrationsGetManifestSchemaFields = z.object({
  userId: userIdField,
  hostAppId: z.string().min(1),
});

export const labIntegrationsHubDiscoverySchemaFields = z.object({
  userId: userIdField,
  hostAppId: z.string().min(1),
  serviceId: z.string().min(1),
});

export const labIntegrationsProvisionFormStubSchemaFields = ProvisionFormStubRequestSchema.extend({
  userId: userIdField,
});

export const labIntegrationsProvisionChartStubSchemaFields = ProvisionChartStubRequestSchema.extend({
  userId: userIdField,
});

export const labIntegrationsResolveLaunchDepsSchemaFields = z.object({
  userId: userIdField,
  hostAppId: z.string().min(1),
});

export type LabIntegrationsListBindingsParams = z.infer<typeof labIntegrationsListBindingsSchemaFields>;
export type LabIntegrationsUpsertBindingParams = z.infer<typeof labIntegrationsUpsertBindingSchemaFields>;
export type LabIntegrationsDeleteBindingParams = z.infer<typeof labIntegrationsDeleteBindingSchemaFields>;
export type LabIntegrationsGetManifestParams = z.infer<typeof labIntegrationsGetManifestSchemaFields>;
export type LabIntegrationsHubDiscoveryParams = z.infer<typeof labIntegrationsHubDiscoverySchemaFields>;
export type LabIntegrationsProvisionFormStubParams = z.infer<
  typeof labIntegrationsProvisionFormStubSchemaFields
>;
export type LabIntegrationsProvisionChartStubParams = z.infer<
  typeof labIntegrationsProvisionChartStubSchemaFields
>;
export type LabIntegrationsResolveLaunchDepsParams = z.infer<
  typeof labIntegrationsResolveLaunchDepsSchemaFields
>;

export function parseBindingCreateForMcp(input: unknown) {
  return LabIntegrationBindingCreateSchema.parse(input);
}

export function parseBindingUpdateForMcp(input: unknown) {
  return LabIntegrationBindingUpdateSchema.parse(input);
}
