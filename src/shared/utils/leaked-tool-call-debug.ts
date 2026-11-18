/** Set `LAB_CHAT_TOOL_LEAK_DEBUG=1` to log salvage attempts on the backend. */
export function isLeakedToolCallDebugEnabled(): boolean {
  const raw = process.env.LAB_CHAT_TOOL_LEAK_DEBUG?.trim();
  return raw === '1' || raw?.toLowerCase() === 'true';
}
