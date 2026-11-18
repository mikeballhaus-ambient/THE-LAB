import type { IApp, LLMProvider } from '../types';
import { resolveProviderCapabilitiesFromAdapter } from './lab-provider-capabilities';

export type SystemPromptAssemblyOptions = {
  chatProviderName?: string;
  nativeToolCalls?: boolean;
};

export function resolveSystemPromptAssembly(
  chatProvider: LLMProvider | undefined,
): SystemPromptAssemblyOptions {
  if (!chatProvider) {
    return {};
  }
  const caps = resolveProviderCapabilitiesFromAdapter(chatProvider);
  return {
    chatProviderName: chatProvider.getName(),
    nativeToolCalls: caps.nativeToolCalls,
  };
}

export function buildMcpToolsSection(toolIds: string[], nativeToolCalls: boolean): string {
  const sorted = [...toolIds].sort((a, b) => a.localeCompare(b));
  const list =
    sorted.length > 0
      ? sorted.join(', ')
      : '(none — switch persona or enable tools in persona settings)';

  if (nativeToolCalls) {
    return `# TOOLS

${sorted.length} MCP tools are attached on this request (JSON schemas via the provider API). Use provider-native tool calling only; do not paste raw JSON tool calls in chat.

Tool ids: ${list}
`;
  }

  return `# TOOLS

${sorted.length} MCP tools are available for this persona when you need external actions. For questions answered in this prompt (e.g. app list under ACTIVE APPS), reply in plain text without calling tools.

`;
}

export function buildPersonasSection(personaNames: string[]): string {
  const names = personaNames.length > 0 ? personaNames.join(', ') : 'Chat';
  return `## Personas

Available: ${names}. Use \`persona_manager_switch_persona\` to change persona in this session.
`;
}

export function buildCurrentPersonaSection(name: string, role: string, rules?: string): string {
  const roleText = role.trim().replace(/\s+/g, ' ');
  const roleShort = roleText.length > 320 ? `${roleText.slice(0, 317)}...` : roleText;
  let block = `## Persona: ${name}\n\n${roleShort}`;
  const rulesText = rules?.trim();
  if (rulesText) {
    const rulesShort = rulesText.length > 240 ? `${rulesText.slice(0, 237)}...` : rulesText;
    block += `\n\nRule: ${rulesShort}`;
  }
  return `${block}\n`;
}

export function buildSessionContextSection(sessionId: string, isDeveloperMode: boolean): string {
  const modeLine = isDeveloperMode
    ? 'Developer mode: use technical detail when helpful (paths, ports, stack, tool names).'
    : `Non-developer mode (user-facing chat):
- Plain language for the user; no file paths, ports, framework names, or internal component names unless they explicitly ask for technical detail.
- After tools run, **summarize** outcomes for a general audience — do not dump tool JSON or architecture notes into the reply.
- For apps: describe purpose, who it helps, and main features from \`description\` only; skip appSystemInstructions-style internals.`;
  return `## Session

sessionId: \`${sessionId}\` — use implicitly when a tool requires sessionId.

${modeLine}
`;
}

export function buildActiveAppsSection(apps: IApp[], isDeveloperMode = true): string {
  const lines: string[] = [];
  for (const app of apps) {
    const desc = (app.description ?? '').trim().replace(/\s+/g, ' ');
    const short = desc.length > 120 ? `${desc.slice(0, 117)}...` : desc;
    lines.push(`- **${app.name}** (\`${app.id}\`)${short ? ` — ${short}` : ''}`);
  }
  lines.push('');
  lines.push(
    'If the user asks which apps are in the lab, answer with the bullet list above in plain text (no tools).',
  );
  if (isDeveloperMode) {
    lines.push('Use `app_management_get_app` for ports, paths, dependencies, and system instructions.');
  } else {
    lines.push(
      'Use `app_management_get_app` only when you need more than the description; answer in user-friendly terms (no ports, paths, or implementation stack unless asked).',
    );
  }
  return lines.join('\n');
}

export const USER_CONTEXT_SECTION = `## User context

Your userId is available for tools that require it. Permission checks still apply server-side.

`;

export const REPO_FILES_SECTION = `# REPO FILES

Repository path listings are omitted to save context. Use \`list_files\` or \`search_repository\` when you need paths.

`;

type UserInstructionsEnv = { LAB_USER_INSTRUCTIONS_MAX_CHARS?: string };

const defaultUserInstructionsEnv: UserInstructionsEnv = {
  LAB_USER_INSTRUCTIONS_MAX_CHARS: process.env.LAB_USER_INSTRUCTIONS_MAX_CHARS,
};

/** Max characters from Settings → User Instructions (default 2500). */
export function resolveUserInstructionsMaxChars(
  env: UserInstructionsEnv = defaultUserInstructionsEnv,
): number {
  const raw = env.LAB_USER_INSTRUCTIONS_MAX_CHARS;
  if (raw === undefined || raw === '') {
    return 2500;
  }
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < 256) {
    return 2500;
  }
  return Math.min(n, 16000);
}

/** Remove blocks duplicated from older sysMsg / pasted platform docs. */
export function stripRedundantInstructionBlocks(text: string): string {
  let out = text.trim();
  const sectionTitles = [
    'NEURAL MEMORY PROTOCOL',
    'CORE BEHAVIOR',
    'EXECUTION RULES',
    'SAFETY AGAINST LOOPING',
    'IDENTITY',
  ];
  for (const title of sectionTitles) {
    out = removeMarkdownSection(out, title);
  }
  out = out.replace(
    /Your job is to execute user instructions precisely[\s\S]*?tool triggers exactly\./gi,
    '',
  );
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

function removeMarkdownSection(body: string, sectionTitle: string): string {
  const escaped = sectionTitle.replace(/\s+/g, '\\s+');
  const headerRe = new RegExp(`^##\\s*${escaped}(?:\\s*\\([^)]*\\))?\\s*$`, 'im');
  const match = headerRe.exec(body);
  if (!match || match.index === undefined) {
    return body;
  }
  const start = match.index;
  const rest = body.slice(start + match[0].length);
  const nextSection = rest.search(/\n##\s+/);
  let end: number;
  if (nextSection !== -1) {
    end = start + match[0].length + nextSection;
  } else {
    const blankBreak = rest.search(/\n\n(?!\s*[-*])/);
    end =
      blankBreak === -1
        ? body.length
        : start + match[0].length + blankBreak;
  }
  return (body.slice(0, start) + body.slice(end)).trim();
}

export function truncateUserInstructions(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return (
    `${text.slice(0, maxChars).trimEnd()}\n\n` +
    `[Truncated for context budget — see Settings → User Instructions for full text.]`
  );
}

/** Returns markdown appendix or empty string when nothing to append. */
export function formatUserInstructionsAppendix(
  rawText: string | undefined | null,
  env?: UserInstructionsEnv,
): string {
  if (!rawText?.trim()) {
    return '';
  }
  let body = stripRedundantInstructionBlocks(rawText.trim());
  body = truncateUserInstructions(body, resolveUserInstructionsMaxChars(env));
  if (!body) {
    return '';
  }
  return `

---

# USER INSTRUCTIONS

${body}`;
}
