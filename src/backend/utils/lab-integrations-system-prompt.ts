import { fileHelpers } from './file-helpers';
import {
  buildIntegrationCodePersonaPreamble,
  detectIntegrationWorkflowPhase,
  LAB_INTEGRATIONS_ROUTING_TEMPLATE_PATH,
  resolveIntegrationPlaybookPath,
  shouldInjectIntegrationRouting,
} from '@/shared/config/lab-integrations-prompt';
import type { LabSidecarChatContext } from '@/shared/types/lab-sidecar-view-context';
import { FILE_PATHS } from '@/shared/types/file-constants';

const markdownCache = new Map<string, string>();

async function readCached(relativePath: string): Promise<string> {
  const key = fileHelpers.toForwardPath(relativePath);
  const hit = markdownCache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const content = await fileHelpers.readFile(relativePath);
  markdownCache.set(key, content);
  return content;
}

export function clearLabIntegrationsPromptCacheForTests(): void {
  markdownCache.clear();
}

/**
 * Appends integration persona routing + optional phase playbook when user intent matches rm-64.
 */
export async function appendLabIntegrationsPromptLayers(
  sysMsg: string,
  options: {
    latestUserMessage?: string;
    labSidecarContext?: LabSidecarChatContext | null;
    currentPersonaName?: string;
  },
): Promise<string> {
  const { latestUserMessage, labSidecarContext, currentPersonaName } = options;
  if (!shouldInjectIntegrationRouting(latestUserMessage, labSidecarContext)) {
    return sysMsg;
  }

  const personaName = currentPersonaName?.trim() || 'Chat';
  const preamble = buildIntegrationCodePersonaPreamble(personaName);
  let out = preamble ? `${preamble}\n\n---\n\n${sysMsg}` : sysMsg;
  const routing = await readCached(LAB_INTEGRATIONS_ROUTING_TEMPLATE_PATH);
  out += `\n\n---\n\n${routing.trim()}\n`;

  const permissions = await readCached(FILE_PATHS.INTEGRATION_PERMISSIONS_TEMPLATE);
  out += `\n\n---\n\n${permissions.trim()}\n`;

  const stubMessaging = await readCached(FILE_PATHS.INTEGRATION_STUB_FORMS_USER_MESSAGING_TEMPLATE);
  out += `\n\n---\n\n${stubMessaging.trim()}\n`;

  const phase = detectIntegrationWorkflowPhase(latestUserMessage, labSidecarContext);
  if (phase) {
    const playbook = await readCached(resolveIntegrationPlaybookPath(phase));
    out += `\n\n---\n\n${playbook.trim()}\n`;
  }

  return out;
}
