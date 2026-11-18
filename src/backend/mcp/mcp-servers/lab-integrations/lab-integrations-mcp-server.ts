import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  labIntegrationsDeleteBindingSchemaFields,
  labIntegrationsGetManifestSchemaFields,
  labIntegrationsHubDiscoverySchemaFields,
  labIntegrationsListBindingsSchemaFields,
  labIntegrationsProvisionChartStubSchemaFields,
  labIntegrationsProvisionFormStubSchemaFields,
  labIntegrationsResolveLaunchDepsSchemaFields,
  labIntegrationsUpsertBindingSchemaFields,
} from '@/shared/types/schemas/lab-integrations-mcp-schemas';
import {
  labIntegrationsDeleteBinding,
  labIntegrationsGetManifest,
  labIntegrationsHubDiscovery,
  labIntegrationsListBindings,
  labIntegrationsProvisionFormStub,
  labIntegrationsProvisionChartStub,
  labIntegrationsResolveLaunchDeps,
  labIntegrationsUpsertBinding,
} from './utils/lab-integrations-mcp-handlers';

export const labIntegrationsMcpServer = new McpServer({
  name: 'system-lab-integrations-server',
  version: '1.0.0',
});

const LIST_BINDINGS_DESC =
  'Authoritative integration status for a host: bindings plus bindingReadiness (providerAssetExists / missing_provider_asset stub check in Forms or Chart Builder DB). Never report “connected” when readiness is missing_provider_asset — provision stubs first. Pair with get_manifest. Requires host update permission or admin.';

labIntegrationsMcpServer.registerTool(
  'lab_integrations_list_bindings',
  { description: LIST_BINDINGS_DESC, inputSchema: labIntegrationsListBindingsSchemaFields },
  async (params) => {
    const result = await labIntegrationsListBindings(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

const UPSERT_DESC =
  'Code persona only — switch silently before calling if the session is Chat/Orchestrator. Creates or updates a global integration binding (never use write_query on lab_integration_bindings). Pass bindingId from list_bindings to update. Manifest default placement is applied on create when config.placement.regionId is omitted. overwrite applies to provision_form_stub, not this tool.';

labIntegrationsMcpServer.registerTool(
  'lab_integrations_upsert_binding',
  { description: UPSERT_DESC, inputSchema: labIntegrationsUpsertBindingSchemaFields },
  async (params) => {
    const result = await labIntegrationsUpsertBinding(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

labIntegrationsMcpServer.registerTool(
  'lab_integrations_delete_binding',
  {
    description: 'Deletes a global integration binding and demotes integration-only dependencies when unused.',
    inputSchema: labIntegrationsDeleteBindingSchemaFields,
  },
  async (params) => {
    const result = await labIntegrationsDeleteBinding(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

labIntegrationsMcpServer.registerTool(
  'lab_integrations_get_manifest',
  {
    description:
      'Host integration manifest (accepts slots, surfaces, integrationServices). Pair with lab_integrations_list_bindings for “what is configured” — not a substitute for reading host REST code.',
    inputSchema: labIntegrationsGetManifestSchemaFields,
  },
  async (params) => {
    const result = await labIntegrationsGetManifest(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

labIntegrationsMcpServer.registerTool(
  'lab_integrations_hub_discovery',
  {
    description: 'Returns Forms Builder discovery contract snapshot from registry hub (no provider launch).',
    inputSchema: labIntegrationsHubDiscoverySchemaFields,
  },
  async (params) => {
    const result = await labIntegrationsHubDiscovery(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

labIntegrationsMcpServer.registerTool(
  'lab_integrations_provision_form_stub',
  {
    description:
      'Provisions a published stub form in Forms Builder app DB from registry service model (platform :3000, no FB process launch).',
    inputSchema: labIntegrationsProvisionFormStubSchemaFields,
  },
  async (params) => {
    const result = await labIntegrationsProvisionFormStub(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

const PROVISION_CHART_STUB_DESC =
  'Provisions a stub chart + data connector in Chart Builder app DB from registry service model (platform :3000, no Chart Builder process launch). Use returned chartKey as providerRef for chart.surface bindings.';

labIntegrationsMcpServer.registerTool(
  'lab_integrations_provision_chart_stub',
  {
    description: PROVISION_CHART_STUB_DESC,
    inputSchema: labIntegrationsProvisionChartStubSchemaFields,
  },
  async (params) => {
    const result = await labIntegrationsProvisionChartStub(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

labIntegrationsMcpServer.registerTool(
  'lab_integrations_resolve_launch_deps',
  {
    description: 'Resolves effective launch dependency app ids (registry deps ∪ enabled binding providers).',
    inputSchema: labIntegrationsResolveLaunchDepsSchemaFields,
  },
  async (params) => {
    const result = await labIntegrationsResolveLaunchDeps(params);
    return { content: [{ type: 'text', text: result.content }], isError: !result.success };
  },
);

export const labIntegrationsToolsManifest = [
  {
    id: 'lab_integrations_list_bindings',
    name: 'Lab Integrations - List Bindings',
    description: LIST_BINDINGS_DESC,
    params: labIntegrationsListBindingsSchemaFields,
  },
  {
    id: 'lab_integrations_upsert_binding',
    name: 'Lab Integrations - Upsert Binding',
    description: UPSERT_DESC,
    params: labIntegrationsUpsertBindingSchemaFields,
  },
  {
    id: 'lab_integrations_delete_binding',
    name: 'Lab Integrations - Delete Binding',
    description:
      'Deletes a global integration binding, demotes host dependencies when unused, and removes integration stub forms/charts when no other binding references the same providerRef.',
    params: labIntegrationsDeleteBindingSchemaFields,
  },
  {
    id: 'lab_integrations_get_manifest',
    name: 'Lab Integrations - Get Manifest',
    description: 'Reads host integration manifest from app registry.',
    params: labIntegrationsGetManifestSchemaFields,
  },
  {
    id: 'lab_integrations_hub_discovery',
    name: 'Lab Integrations - Hub Discovery',
    description: 'Registry snapshot discovery contract for an integration service.',
    params: labIntegrationsHubDiscoverySchemaFields,
  },
  {
    id: 'lab_integrations_provision_form_stub',
    name: 'Lab Integrations - Provision Form Stub',
    description: 'Creates stub form + connector in Forms Builder DB.',
    params: labIntegrationsProvisionFormStubSchemaFields,
  },
  {
    id: 'lab_integrations_provision_chart_stub',
    name: 'Lab Integrations - Provision Chart Stub',
    description: PROVISION_CHART_STUB_DESC,
    params: labIntegrationsProvisionChartStubSchemaFields,
  },
  {
    id: 'lab_integrations_resolve_launch_deps',
    name: 'Lab Integrations - Resolve Launch Dependencies',
    description: 'Effective dependency app ids for host launch.',
    params: labIntegrationsResolveLaunchDepsSchemaFields,
  },
];
