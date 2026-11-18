import { applyLabSidecarPersonaTools } from '@/shared/config/lab-sidecar-app-builder-tools';
import {
  applyLabSidecarIntegrationPersonaTools,
  resolveLabSidecarToolAllowlist,
} from '@/shared/config/lab-sidecar-integration-tools';
import type { LabSidecarChatContext } from '@/shared/types/lab-sidecar-view-context';
import type { Persona } from '@/shared/types/persona';
import {
  clearLabSidecarSessionToolAllowlist,
  setLabSidecarSessionToolAllowlist,
} from './lab-sidecar-tool-profile-session';

export function prepareLabSidecarChatTurn(
  sessionId: string,
  personaConfig: Persona | undefined,
  labSidecarContext: LabSidecarChatContext | undefined | null,
): Persona | undefined {
  const profile = labSidecarContext?.toolProfile;
  if (!labSidecarContext || !profile) {
    clearLabSidecarSessionToolAllowlist(sessionId);
    return personaConfig;
  }

  let narrowed = personaConfig;
  if (profile === 'app_builder') {
    narrowed = applyLabSidecarPersonaTools(personaConfig, 'app_builder');
  } else if (profile === 'integration') {
    narrowed = applyLabSidecarIntegrationPersonaTools(personaConfig, 'integration');
  }

  const defaultAllowlist = resolveLabSidecarToolAllowlist(profile);
  const tools = narrowed?.tools ?? [];
  setLabSidecarSessionToolAllowlist(
    sessionId,
    tools.length > 0 ? tools : defaultAllowlist ?? [],
  );
  return narrowed;
}
