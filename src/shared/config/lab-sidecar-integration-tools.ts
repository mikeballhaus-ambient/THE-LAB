import type { Persona } from '@/shared/types/persona';
import type { LabSidecarToolProfile } from '@/shared/types/lab-sidecar-view-context';
import { LAB_SIDECAR_APP_BUILDER_TOOL_IDS } from './lab-sidecar-app-builder-tools';

/** Platform rm-64 integration MCP tools + file/repo tools for host customization. */
export const LAB_SIDECAR_INTEGRATION_TOOL_IDS: readonly string[] = [
  'persona_manager_switch_persona',
  'lab_integrations_list_bindings',
  'lab_integrations_upsert_binding',
  'lab_integrations_delete_binding',
  'lab_integrations_get_manifest',
  'lab_integrations_hub_discovery',
  'lab_integrations_provision_form_stub',
  'lab_integrations_provision_chart_stub',
  'lab_integrations_resolve_launch_deps',
  'app_management_get_app',
  'app_management_get_apps',
  'app_management_update_app',
  'read_file_read_file',
  'update_file_update_file',
  'list_files_list_files',
  'search_repository',
  'todo_list_create_list',
  'todo_list_add_todo_item',
  'todo_list_get_todo_list_state',
  'context7_resolve_library_id',
  'context7_query_docs',
  'ui_automation_discover_elements',
  'ui_automation_element_action',
  'awaiter',
];

export function applyLabSidecarIntegrationPersonaTools(
  personaConfig: Persona | undefined,
  toolProfile: LabSidecarToolProfile | undefined,
): Persona | undefined {
  if (!personaConfig || toolProfile !== 'integration') {
    return personaConfig;
  }
  const allowed = new Set(LAB_SIDECAR_INTEGRATION_TOOL_IDS);
  const tools = personaConfig.tools.filter((id) => allowed.has(id));
  return { ...personaConfig, tools };
}

export function resolveLabSidecarToolAllowlist(
  toolProfile: LabSidecarToolProfile | undefined,
): readonly string[] | null {
  if (toolProfile === 'app_builder') {
    return LAB_SIDECAR_APP_BUILDER_TOOL_IDS;
  }
  if (toolProfile === 'integration') {
    return LAB_SIDECAR_INTEGRATION_TOOL_IDS;
  }
  return null;
}
