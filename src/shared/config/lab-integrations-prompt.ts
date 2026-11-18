import type {
  LabIntegrationWorkflowPhase,
  LabSidecarChatContext,
} from '@/shared/types/lab-sidecar-view-context';
import { FILE_PATHS } from '@/shared/types/file-constants';

const INTEGRATION_KEYWORD_RE =
  /\b(integrat(?:e|ion)|plugin|bind(?:ing)?s?|unbind|re-?add\s+(?:stub|bind)|remove\s+(?:all\s+)?bind|delete\s+bind|restore\s+bind|manifest|lab_integrations|data\s+connectors?|designer\.(?:metadata|connector)|unbound\s+slot|connector|forms?\s*builder|chart\s*builder|labintegrationhost|integration_services?|integrationServices|provision\s+(?:a\s+)?stub|wire\s+(?:a\s+)?form|clean\s+slate|what(?:'s| is)\s+(?:configured|missing|set\s+up)|new\s+(?:task|list)\b.*\bform|plugin\s+form|share\s+data|expose\s+(?:a\s+)?service|consumes?|new\s+slot|host\s+shell|integration\s+surface|export\s+(?:host|integration))\b/i;

const PHASE_TEMPLATE_PATH: Record<LabIntegrationWorkflowPhase, string> = {
  discover: './src/shared/templates/lab-integrations/wizard-phase-discover.md',
  bind_form: './src/shared/templates/lab-integrations/wizard-phase-bind-form.md',
  bind_chart: './src/shared/templates/lab-integrations/wizard-phase-bind-chart.md',
  export_host: './src/shared/templates/lab-integrations/wizard-phase-export-host.md',
  host_shell: './src/shared/templates/lab-integrations/wizard-phase-host-shell.md',
};

const ALL_PHASES: LabIntegrationWorkflowPhase[] = [
  'discover',
  'bind_form',
  'bind_chart',
  'export_host',
  'host_shell',
];

function isWorkflowPhase(value: unknown): value is LabIntegrationWorkflowPhase {
  return typeof value === 'string' && (ALL_PHASES as string[]).includes(value);
}

function detectPhaseFromMessage(text: string): LabIntegrationWorkflowPhase | undefined {
  const lower = text.toLowerCase();
  if (
    /\b(chart\.surface|chart\s+stub|provision_chart|bind\s+(?:a\s+)?chart|status\s+chart|reports\.|kpi\s+chart|chart\s+builder)\b/.test(
      lower,
    )
  ) {
    return 'bind_chart';
  }
  if (
    /\b(export\s+(?:host|integration)|expose\b|share\s+data|integration\s*services?|other\s+apps\s+consume|publish\s+(?:a\s+)?service)\b/.test(
      lower,
    )
  ) {
    return 'export_host';
  }
  if (
    /\b(host\s+shell|labintegrationhost|integration\s+surface|new\s+slot|add\s+(?:a\s+)?dialog|layout\s+region|integrationsurfaces|openslot|migrate\s+host)\b/.test(
      lower,
    )
  ) {
    return 'host_shell';
  }
  if (/\b(bind|upsert|provision_form|form\s+stub|wire\s+(?:a\s+)?form)\b/.test(lower)) {
    return 'bind_form';
  }
  return undefined;
}

export function detectIntegrationWorkflowPhase(
  userMessage: string | undefined,
  ctx: LabSidecarChatContext | undefined | null,
): LabIntegrationWorkflowPhase | undefined {
  const phase = ctx?.integrationWorkflowPhase;
  if (isWorkflowPhase(phase)) {
    return phase;
  }
  const text = userMessage ?? '';
  const fromMessage = detectPhaseFromMessage(text);
  if (fromMessage) {
    return fromMessage;
  }
  if (shouldInjectIntegrationRouting(userMessage, ctx)) {
    return 'discover';
  }
  return undefined;
}

const LIST_BINDINGS_RE =
  /\b(list|show|what(?:'s| are)|enumerate|audit)\b.{0,40}\bbind(?:ing)?s?\b|\bbind(?:ing)?s?\b.{0,40}\b(for|on)\b/i;

/** Shown at the **top** of the system message when integration intent fires on a non-Code persona. */
export function buildIntegrationCodePersonaPreamble(currentPersonaName: string): string | null {
  if (currentPersonaName.trim().toLowerCase() === 'code') {
    return null;
  }
  return `# INTEGRATION TURN — switch to Code first

Active persona: **${currentPersonaName.trim()}**. \`lab_integrations_*\` tools (including \`lab_integrations_list_bindings\`) are allowlisted on **Code** only.

**Mandatory this turn:** First tool call = \`persona_manager_switch_persona\` with \`targetPersona: "Code"\` and \`sessionId\` from system context. Do **not** answer the user before that call. Do **not** claim integration tools are missing — switch persona, then call \`lab_integrations_list_bindings\` / \`lab_integrations_get_manifest\` on the correct \`hostAppId\` (e.g. \`app-lab-chartbuilder\`).

Forbidden: apologizing, offering external workflows or UI automation as a substitute for listing bindings.`;
}

export function shouldInjectIntegrationRouting(
  userMessage: string | undefined,
  ctx: LabSidecarChatContext | undefined | null,
): boolean {
  if (ctx?.integrationIntent) {
    return true;
  }
  if (ctx?.toolProfile === 'integration') {
    return true;
  }
  if (ctx?.focusedAppId && userMessage && INTEGRATION_KEYWORD_RE.test(userMessage)) {
    return true;
  }
  if (userMessage && INTEGRATION_KEYWORD_RE.test(userMessage)) {
    return true;
  }
  if (userMessage && LIST_BINDINGS_RE.test(userMessage)) {
    return true;
  }
  return false;
}

export function resolveIntegrationPlaybookPath(phase: LabIntegrationWorkflowPhase): string {
  return PHASE_TEMPLATE_PATH[phase];
}

export const LAB_INTEGRATIONS_ROUTING_TEMPLATE_PATH = FILE_PATHS.INTEGRATION_PLUGIN_ROUTING_TEMPLATE;
