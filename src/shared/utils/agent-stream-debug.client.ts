type AgentStreamDebugDetail = Record<string, unknown>;

function enabled(): boolean {
  if (
    import.meta.env.VITE_TW_AGENT_STREAM_DEBUG === '0' ||
    import.meta.env.VITE_AGENT_STREAM_DEBUG === '0'
  ) {
    return false;
  }
  // Default ON while TW vs-AI streaming is being stabilized (opt out: VITE_TW_AGENT_STREAM_DEBUG=0).
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

/** Browser DevTools — default on; silence with VITE_TW_AGENT_STREAM_DEBUG=0 */
export function twAgentStreamDebugClient(message: string, detail?: AgentStreamDebugDetail): void {
  if (!enabled()) {
    return;
  }
  console.log(`[tw-agent-stream:client] ${message}${formatDetail(detail)}`);
}
