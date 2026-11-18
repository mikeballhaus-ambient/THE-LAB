/** Delay before TOOL_CALL_BEFORE / AFTER UI events (rm-46 **2.27**). */
export function getMcpToolUiDelayMs(): number {
  const raw = process.env.LAB_MCP_TOOL_UI_DELAY_MS;
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 100;
}

export function sleepMcpToolUiDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, getMcpToolUiDelayMs()));
}
