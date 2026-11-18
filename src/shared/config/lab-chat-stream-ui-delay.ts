/** Delay before emitting streaming token deltas to the UI (content/reasoning). */
export function getLabChatStreamUiDelayMs(): number {
  const raw = process.env.LAB_CHAT_STREAM_UI_DELAY_MS;
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 1;
}
