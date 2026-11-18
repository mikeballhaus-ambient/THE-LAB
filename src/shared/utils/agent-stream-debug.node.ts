type AgentStreamDebugDetail = Record<string, unknown>;

function enabled(envKey: string): boolean {
  if (process.env.AGENT_STREAM_DEBUG === '0' || process.env[envKey] === '0') {
    return false;
  }
  // Default ON while TW vs-AI streaming is being stabilized (opt out: AGENT_STREAM_DEBUG=0).
  return true;
}

function formatDetail(detail?: AgentStreamDebugDetail): string {
  if (!detail || Object.keys(detail).length === 0) {
    return '';
  }
  try {
    return ` ${JSON.stringify(detail)}`;
  } catch {
    return ' [detail unserializable]';
  }
}

/**
 * Watch agent-turn latency (chess app server terminal):
 * - `[tw-agent-stream] phase chessMinimaxSearchAdvisory` — local alpha-beta before HTTP
 * - `[tw-agent-stream] phase buildUserPrompt` — full user prompt (includes search)
 * - `[tw-agent-stream] platform complete (non-stream) fetch start` — LLM HTTP begins
 * - `[tw-agent-stream] phase providerRound` — prompt build + one provider round
 * Silence all of the above with `AGENT_STREAM_DEBUG=0`.
 */

/** Platform main backend (:3000) — default on; silence with AGENT_STREAM_DEBUG=0 */
export function platformLlmStreamDebug(message: string, detail?: AgentStreamDebugDetail): void {
  if (!enabled('PLATFORM_LLM_STREAM_DEBUG')) {
    return;
  }
  console.log(`[platform-llm-stream] ${message}${formatDetail(detail)}`);
}

/** High-resolution elapsed ms since {@link agentTurnMark}. */
export function agentTurnMark(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

/**
 * Agent-turn phase timing on app servers (chess, etc.).
 * Default on with {@link twAgentStreamDebug}; silence with AGENT_STREAM_DEBUG=0.
 */
export function agentTurnPhaseDebug(phase: string, detail?: AgentStreamDebugDetail): void {
  twAgentStreamDebug(`phase ${phase}`, detail);
}

/** Time Wasters app server — default on; silence with AGENT_STREAM_DEBUG=0 */
export function twAgentStreamDebug(message: string, detail?: AgentStreamDebugDetail): void {
  if (!enabled('TW_AGENT_STREAM_DEBUG')) {
    return;
  }
  console.log(`[tw-agent-stream] ${message}${formatDetail(detail)}`);
}

/** Full multiline prompt text (user/system) for TW agent debugging — default on with twAgentStreamDebug. */
export function twAgentPromptDebug(
  label: string,
  text: string,
  detail?: AgentStreamDebugDetail,
): void {
  if (!enabled('TW_AGENT_STREAM_DEBUG')) {
    return;
  }
  const meta = { ...detail, charLen: text.length };
  console.log(`[tw-agent-stream] ${label}${formatDetail(meta)}`);
  console.log(`[tw-agent-stream] ${label} — begin\n${text}\n[tw-agent-stream] ${label} — end`);
}
