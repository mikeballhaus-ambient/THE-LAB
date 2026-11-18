/** Default delay for non-streaming socket UI events (RESPONSE, TOKEN_PROGRESS, etc.). */
export function getLabChatUiDispatchDelayMs(): number {
  const raw = process.env.LAB_CHAT_UI_DISPATCH_DELAY_MS;
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 1;
}
