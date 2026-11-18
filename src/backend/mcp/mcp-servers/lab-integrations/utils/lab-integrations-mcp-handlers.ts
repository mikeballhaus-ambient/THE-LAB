import { UserService } from '@/backend/db/Auth/auth-service';
import {
  LabIntegrationsError,
  labIntegrationsService,
} from '@/backend/db/LabIntegrations/lab-integrations-service';
import { labIntegrationsDependencyCoordinator } from '@/backend/lab-integrations/lab-integrations-dependency-coordinator';
import { labIntegrationsFormStubProvisioner } from '@/backend/lab-integrations/lab-integrations-form-stub-provisioner';
import { labIntegrationsChartStubProvisioner } from '@/backend/lab-integrations/lab-integrations-chart-stub-provisioner';
import { labIntegrationsHubService } from '@/backend/lab-integrations/lab-integrations-hub-service';
import type { MCPToolResponse } from '@/shared/types';
import type {
  LabIntegrationsDeleteBindingParams,
  LabIntegrationsGetManifestParams,
  LabIntegrationsHubDiscoveryParams,
  LabIntegrationsListBindingsParams,
  LabIntegrationsProvisionChartStubParams,
  LabIntegrationsProvisionFormStubParams,
  LabIntegrationsResolveLaunchDepsParams,
  LabIntegrationsUpsertBindingParams,
} from '@/shared/types/schemas/lab-integrations-mcp-schemas';
import type { User } from '@/shared/types/user';
import { appendLabIntegrationsAgentHint } from '@/shared/lab-integrations/lab-integrations-tool-error-hints';
import { mergeBindingConfigFromMcpFields } from '@/shared/lab-integrations/merge-binding-config-from-mcp';
import { applyManifestDefaultPlacementToBindingConfig } from '@/shared/lab-integrations/resolve-slot-default-placement';
import { appsRepository } from '@/backend/db/Apps/apps-repository';
import { auditBindingsProviderAssets } from '@/backend/lab-integrations/audit-bindings-provider-assets';

function toolError(message: string): MCPToolResponse {
  return {
    type: 'tool_result',
    tool_call_id: 'lab_integrations',
    function: 'lab_integrations',
    content: message,
    success: false,
  };
}

function toolSuccess(payload: unknown): MCPToolResponse {
  return {
    type: 'tool_result',
    tool_call_id: 'lab_integrations',
    function: 'lab_integrations',
    content: JSON.stringify(payload, null, 2),
    success: true,
  };
}

function resolveCaller(userId: number): User | MCPToolResponse {
  const user = UserService.getInstance().getUserById(userId);
  if (!user) {
    return toolError(`User not found for userId ${userId}`);
  }
  return user;
}

function mapIntegrationError(err: unknown, toolId?: string): MCPToolResponse {
  if (err instanceof LabIntegrationsError) {
    if (err.code === 'FORBIDDEN') {
      return toolError(
        `${err.code}: ${err.message} — current user lacks permission; explain kindly per integration-permissions playbook (host app update or owner/admin).`,
      );
    }
    const base = `${err.code}: ${err.message}`;
    if (toolId) {
      return toolError(appendLabIntegrationsAgentHint(toolId, base));
    }
    return toolError(base);
  }
  const message = err instanceof Error ? err.message : String(err);
  return toolError(toolId ? appendLabIntegrationsAgentHint(toolId, message) : message);
}

export async function labIntegrationsListBindings(
  params: LabIntegrationsListBindingsParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const bindings = labIntegrationsService.listBindingsForCaller(caller, params.hostAppId);
    const audit = await auditBindingsProviderAssets(bindings);
    return toolSuccess(audit);
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_list_bindings');
  }
}

export async function labIntegrationsUpsertBinding(
  params: LabIntegrationsUpsertBindingParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    let mergedConfig = params.config;
    if (
      params.presentation
      || params.placementRegionId
      || params.placementSurfaceId
      || params.placementOrder !== undefined
    ) {
      mergedConfig = mergeBindingConfigFromMcpFields({
        config: params.config,
        presentation: params.presentation,
        placementRegionId: params.placementRegionId,
        placementSurfaceId: params.placementSurfaceId,
        placementOrder: params.placementOrder,
      });
    }
    if (params.bindingId) {
      const binding = await labIntegrationsService.updateBindingForCaller(caller, params.bindingId, {
        providerAppId: params.providerAppId,
        providerRef: params.providerRef,
        config: mergedConfig,
        enabled: params.enabled,
      });
      return toolSuccess({ binding, operation: 'update' });
    }
    if (
      !params.hostAppId ||
      !params.slot ||
      !params.kind ||
      !params.providerAppId ||
      !params.providerRef
    ) {
      return toolError(
        'Create requires hostAppId, slot, kind, providerAppId, and providerRef (or bindingId for update)',
      );
    }
    const manifest = appsRepository.getIntegrationManifest(params.hostAppId);
    const configWithPlacement = applyManifestDefaultPlacementToBindingConfig(
      manifest,
      params.slot,
      params.kind,
      mergedConfig ?? { schemaVersion: 1 },
    );
    const binding = await labIntegrationsService.createBindingForCaller(caller, {
      hostAppId: params.hostAppId,
      slot: params.slot,
      kind: params.kind,
      providerAppId: params.providerAppId,
      providerRef: params.providerRef,
      config: configWithPlacement,
      enabled: params.enabled ?? true,
    });
    return toolSuccess({ binding, operation: 'create' });
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_upsert_binding');
  }
}

export async function labIntegrationsDeleteBinding(
  params: LabIntegrationsDeleteBindingParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const result = await labIntegrationsService.deleteBindingForCaller(caller, params.bindingId);
    return toolSuccess({ deleted: result.bindingId, cleanup: result.cleanup });
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_delete_binding');
  }
}

export async function labIntegrationsGetManifest(
  params: LabIntegrationsGetManifestParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const manifest = labIntegrationsHubService.getManifestForCaller(caller, params.hostAppId);
    return toolSuccess({ manifest });
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_get_manifest');
  }
}

export async function labIntegrationsHubDiscovery(
  params: LabIntegrationsHubDiscoveryParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const contract = labIntegrationsHubService.getRegistryDiscoveryForCaller(
      caller,
      params.hostAppId,
      params.serviceId,
    );
    return toolSuccess({ contract });
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_hub_discovery');
  }
}

export async function labIntegrationsProvisionFormStub(
  params: LabIntegrationsProvisionFormStubParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const { userId, ...body } = params;
    void userId;
    const result = await labIntegrationsFormStubProvisioner.provisionForCaller(caller, body);
    return toolSuccess(result);
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_provision_form_stub');
  }
}

export async function labIntegrationsProvisionChartStub(
  params: LabIntegrationsProvisionChartStubParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const { userId, ...body } = params;
    void userId;
    const result = await labIntegrationsChartStubProvisioner.provisionForCaller(caller, body);
    return toolSuccess(result);
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_provision_chart_stub');
  }
}

export async function labIntegrationsResolveLaunchDeps(
  params: LabIntegrationsResolveLaunchDepsParams,
): Promise<MCPToolResponse> {
  const caller = resolveCaller(params.userId);
  if ('success' in caller) {
    return caller;
  }
  try {
    const dependencyAppIds = labIntegrationsDependencyCoordinator.getLaunchDependencyIds(
      params.hostAppId,
    );
    return toolSuccess({ dependencyAppIds });
  } catch (err) {
    return mapIntegrationError(err, 'lab_integrations_resolve_launch_deps');
  }
}
