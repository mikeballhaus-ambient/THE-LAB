import type { ChatMessage } from '../../../shared/types';
import {
  recordAgentTurnRecovery,
  recordStreamTurnRecovery,
} from '../../../shared/config/lab-model-turn-recovery-metrics';

const MALFORMED_TOOL_TABLE = `| Mistake | Impact | Prevention |
| ------- | ------ | ---------- |
| Sending JSON as plain text | Tool call not recognized | Only use system tool calling mechanism |
| Using XML tags in response | Formatting errors | Use markdown only |
| Missing required parameters | Tool execution fails | Validate against schema first |
| Wrong parameter types | Validation errors | Match Zod schemas exactly |
| Mismatched curly braces \`{}\` | Malformed tool call | **Count opening and closing braces before sending** - ensure every \`{\` has a matching \`}\` |`;

export function buildMalformedToolRetryUserMessage(
  invalidToolCallError?: string,
  invalidToolCallOriginalJson?: string,
): string {
  return `**CRITICAL!** Your previous tool call could not be executed — the platform rejected it before running MCP.

COMMON MISTAKES TO AVOID

${MALFORMED_TOOL_TABLE}

**Unescaped quotes inside JSON strings** (common with CSS selectors in \`ui_automation_element_action\`) break parsing. Prefer \`ui_automation_discover_elements\` first, then click using the exact \`target\` from discovery. **Count every \`{\` and \`}\`** — an extra \`}\` before \`]\` orphans the call. For list **Edit**, use \`searchPattern\` on the **record name** (e.g. workflow title), not the word \`Edit\`; scope mounted apps with the app root class (e.g. \`lab-workflow-studio-app\`), not broad \`app-loaded-container\`.

Parse / validation detail:
${invalidToolCallError?.trim() || 'unknown'}

Original malformed payload (for your retry):
${invalidToolCallOriginalJson?.trim() || '(none captured)'}

Re-issue the tool using **valid JSON only** (native tool_calls when supported), or a corrected parameters object.`;
}

export function buildReasoningOnlyRetryUserMessage(reasoning: string): string {
  return `**CRITICAL!** Your previous response only contained reasoning without any content or tool_calls!
      
You MUST ALWAYS provide either user content or tool_calls. 

Here was your previous message reasoning: [${reasoning}]`;
}

export function buildEmptyTurnRetryUserMessage(): string {
  return `**CRITICAL!** Your previous response did not contain any content or tool_calls!
      
You MUST ALWAYS provide either user content or tool_calls.`;
}

export type TurnRecoveryAction = 'none' | 'retry_push_error_chunk' | 'retry_push_user_message';

export interface StreamTurnRecoveryInput {
  /** Executable tool calls after JSON validation (preferred). */
  executableToolCallsLength?: number;
  toolCallsLength: number;
  contentLength: number;
  reasoningLength: number;
  reasoningText: string;
  invalidToolCallExtracted?: boolean;
  invalidToolCallError?: string;
  invalidToolCallOriginalJson?: string;
  latestChunkIsError?: boolean;
}

function executableToolCount(input: { executableToolCallsLength?: number; toolCallsLength: number }): number {
  return input.executableToolCallsLength ?? input.toolCallsLength;
}

/** Applies recovery for a completed stream turn (rm-46 **2.12**). */
export function applyStreamTurnRecoveryMessages(
  input: StreamTurnRecoveryInput,
  fullMessages: ChatMessage[],
  latestChunk: ChatMessage | undefined,
): TurnRecoveryAction {
  const finish = (action: TurnRecoveryAction): TurnRecoveryAction => {
    recordStreamTurnRecovery(action);
    return action;
  };
  if (executableToolCount(input) > 0) {
    return finish('none');
  }
  if (input.latestChunkIsError && latestChunk) {
    return finish('none');
  }
  if (input.invalidToolCallExtracted) {
    fullMessages.push({
      role: 'user',
      content: buildMalformedToolRetryUserMessage(
        input.invalidToolCallError,
        input.invalidToolCallOriginalJson,
      ),
    });
    return finish('retry_push_user_message');
  }
  if (input.contentLength === 0 && input.reasoningLength > 0) {
    fullMessages.push({
      role: 'user',
      content: buildReasoningOnlyRetryUserMessage(input.reasoningText),
    });
    return finish('retry_push_user_message');
  }
  if (input.contentLength === 0 && input.reasoningLength === 0) {
    fullMessages.push({ role: 'user', content: buildEmptyTurnRetryUserMessage() });
    return finish('retry_push_user_message');
  }
  return finish('none');
}

export interface AgentTurnRecoveryInput {
  executableToolCallsLength?: number;
  toolCallsLength: number;
  messageLength: number;
  reasoningLength: number;
  reasoningText: string;
  invalidToolCallExtracted?: boolean;
  invalidToolCallError?: string;
  invalidToolCallOriginalJson?: string;
  messageIsError?: boolean;
}

export function applyAgentTurnRecoveryMessages(
  input: AgentTurnRecoveryInput,
  fullMessages: ChatMessage[],
  errorMessage: ChatMessage | undefined,
): TurnRecoveryAction {
  const finish = (action: TurnRecoveryAction): TurnRecoveryAction => {
    recordAgentTurnRecovery(action);
    return action;
  };
  if (executableToolCount(input) > 0) {
    return finish('none');
  }
  if (input.messageIsError && errorMessage) {
    // Terminal provider errors — show once in UI; do not feed back into the model.
    return finish('none');
  }
  if (input.invalidToolCallExtracted) {
    fullMessages.push({
      role: 'user',
      content: buildMalformedToolRetryUserMessage(
        input.invalidToolCallError,
        input.invalidToolCallOriginalJson,
      ),
    });
    return finish('retry_push_user_message');
  }
  if (input.messageLength === 0 && input.reasoningLength > 0) {
    fullMessages.push({
      role: 'user',
      content: buildReasoningOnlyRetryUserMessage(input.reasoningText),
    });
    return finish('retry_push_user_message');
  }
  if (input.messageLength === 0 && input.reasoningLength === 0) {
    fullMessages.push({ role: 'user', content: buildEmptyTurnRetryUserMessage() });
    return finish('retry_push_user_message');
  }
  return finish('none');
}
