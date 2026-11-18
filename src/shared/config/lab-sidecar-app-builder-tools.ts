import type { Persona } from '@/shared/types/persona';
import type { LabSidecarToolProfile } from '@/shared/types/lab-sidecar-view-context';

/** App Management + catalog UI automation for Sidecar-first app creation (rm-63). */
export const LAB_SIDECAR_APP_BUILDER_TOOL_IDS: readonly string[] = [
  'app_management_create_app',
  'app_management_get_app',
  'app_management_get_apps',
  'app_management_update_app',
  'app_management_delete_app',
  'app_management_add_table',
  'app_management_remove_table',
  'app_management_add_column',
  'app_management_remove_column',
  'app_management_select',
  'app_management_insert',
  'app_management_update',
  'app_management_delete',
  'app_management_execute_raw',
  'ui_automation_discover_elements',
  'ui_automation_element_action',
  'awaiter',
];

export function applyLabSidecarPersonaTools(
  personaConfig: Persona | undefined,
  toolProfile: LabSidecarToolProfile | undefined,
): Persona | undefined {
  if (!personaConfig || toolProfile !== 'app_builder') {
    return personaConfig;
  }
  const allowed = new Set(LAB_SIDECAR_APP_BUILDER_TOOL_IDS);
  const tools = personaConfig.tools.filter((id) => allowed.has(id));
  return { ...personaConfig, tools };
}
