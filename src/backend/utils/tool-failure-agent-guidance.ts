import type { ZodError } from 'zod';
import { resolveLabIntegrationsToolFixHint } from '@/shared/lab-integrations/lab-integrations-tool-error-hints';
export type ToolFailureKind =
  | 'arguments_parse'
  | 'arguments_validation'
  | 'tool_not_found'
  | 'persona_denied'
  | 'production_denied'
  | 'execution'
  | 'unknown';

export interface ToolFailureSummary {
  toolId: string;
  kind: ToolFailureKind;
  detail: string;
}

const RECOVERY_ACTIONS = `**What you must do next**

1. Read the tool result error(s) above carefully.
2. Fix the problem (parameters, permissions, or approach).
3. Call the tool again using the **native tool-calling mechanism** with corrected arguments — do not paste JSON in chat text.
4. If you cannot fix it after adapting, explain the blocker to the user and ask for help.

**Parameter reminders**

- \`userId\` and \`sessionId\` are applied server-side from the active session when needed — use correct types if you still send them.
- App Management tools need registry \`id\` values (for example \`app-lab-crm\`), not display names alone.
- Match each tool's JSON schema types exactly (numbers vs strings, required fields).
- UI automation: catalog launch uses \`contextArea: "app-list-container"\` + \`searchPattern\` (plain substring). Discover returns \`elementRef\` — pass it to \`ui_automation_element_action\` (\`target\` is fallback). List edit/delete: \`searchPattern\` on record name; prefer \`elementRef\` from discover. Do not paginate without \`searchPattern\`. Do not promise UI work in chat — call the tools in the same turn.`;

export function classifyToolFailureMessage(message: string): ToolFailureKind {
  const lower = message.toLowerCase();
  if (message.startsWith('Invalid arguments for')) {
    return 'arguments_validation';
  }
  if (lower.includes('not valid json') || lower.includes('tool arguments are empty')) {
    return 'arguments_parse';
  }
  if (lower.startsWith('tool ') && lower.includes(' not found')) {
    return 'tool_not_found';
  }
  if (lower.includes('not available for this persona')) {
    return 'persona_denied';
  }
  if (lower.includes('production profile') || lower.includes('not permitted under production')) {
    return 'production_denied';
  }
  if (message.includes('**BREAKING LOOP WARNING**')) {
    return 'execution';
  }
  return 'unknown';
}

function kindHeading(kind: ToolFailureKind): string {
  switch (kind) {
    case 'arguments_validation':
      return 'Argument validation failed';
    case 'arguments_parse':
      return 'Tool arguments could not be parsed';
    case 'tool_not_found':
      return 'Unknown tool';
    case 'persona_denied':
      return 'Tool not allowed for this persona';
    case 'production_denied':
      return 'Tool blocked by production policy';
    case 'execution':
      return 'Tool execution failed';
    default:
      return 'Tool call failed';
  }
}

function kindFixHints(toolId: string, kind: ToolFailureKind, detail?: string): string {
  if (detail) {
    const integrationHint = resolveLabIntegrationsToolFixHint(toolId, detail);
    if (integrationHint) {
      return integrationHint;
    }
  }

  switch (kind) {
    case 'arguments_validation':
      if (toolId.startsWith('app_management_')) {
        return 'Use the app registry `id` (e.g. `app-lab-crm`). Required fields must match the tool schema.';
      }
      if (toolId.startsWith('ui_automation_')) {
        return 'Use `contextArea: "app-list-container"` and `searchPattern` (plain substring, e.g. Workflow Studio). Click via `elementRef` from discovery (preferred) or `target`. Call tools again — do not only tell the user you will try.';
      }
      return 'Compare your arguments to the tool schema; fix missing fields and wrong types, then call the tool again.';
    case 'arguments_parse':
      return 'Ensure the tool call arguments object is complete valid JSON before the call finishes streaming.';
    case 'tool_not_found':
      return 'Use only tools listed for your persona in the system prompt.';
    case 'persona_denied':
      return 'Choose a different tool or ask the user to switch persona.';
    case 'production_denied':
      return 'Do not retry this tool in production; use an allowed alternative or tell the user.';
    case 'execution':
      return 'Change inputs or strategy based on the error text; avoid repeating the same failing call.';
    default:
      return 'Adjust your approach based on the error, then retry or inform the user.';
  }
}

export function formatZodValidationFailure(toolId: string, error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    return `- \`${path}\`: ${issue.message}`;
  });
  return `Invalid arguments for ${toolId}:\n${issues.join('\n')}`;
}

/** Expanded text stored in tool results and shown to the model. */
export function enrichAgentToolFailureMessage(
  toolId: string,
  kind: ToolFailureKind,
  detail: string,
): string {
  const heading = kindHeading(kind);
  const hints = kindFixHints(toolId, kind, detail);
  return `${heading} (${toolId})

${detail}

How to fix: ${hints}`;
}

export function buildToolFailureRecoveryUserMessage(summaries: ToolFailureSummary[]): string {
  if (summaries.length === 0) {
    return '';
  }

  const blocks = summaries.map((s) => {
    const heading = kindHeading(s.kind);
    return `### ${s.toolId}
- **Issue:** ${heading}
- **Detail:** ${s.detail}
- **Fix:** ${kindFixHints(s.toolId, s.kind, s.detail)}`;
  });

  return `**CRITICAL — tool call(s) failed**

One or more tools did not run successfully. Do **not** reply to the user as if they succeeded.

${blocks.join('\n\n')}

${RECOVERY_ACTIONS}`;
}

export function shouldSkipToolFailureRecoveryNudge(summaries: ToolFailureSummary[]): boolean {
  return summaries.some((s) => s.detail.includes('**BREAKING LOOP WARNING**'));
}

/** Record failure for follow-up nudge and return expanded tool result message text. */
export function buildEnrichedToolFailureContent(
  toolId: string,
  rawDetail: string,
  summaries: ToolFailureSummary[],
): string {
  const kind = classifyToolFailureMessage(rawDetail);
  const enriched = enrichAgentToolFailureMessage(toolId, kind, rawDetail);
  summaries.push({ toolId, kind, detail: enriched });
  return enriched;
}

export const TOOL_FAILURE_LOOP_WARNING_SUFFIX = `**BREAKING LOOP WARNING**

I have detected that you are attempting the same action repeatedly with the exact same parameters and result.

**You must break this pattern immediately.**

Review ALL previous error messages and adapt your approach based on the error's suggested fix.

DO NOT:
- Repeatedly make the same call with minimal changes
- Ignore the error messages provided
- Continue in this loop without addressing the underlying issue

You must adapt your approach or ask for human assistance to resolve this issue.`;
