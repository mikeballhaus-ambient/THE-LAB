const waiters = new Map<string, () => void>();

/** Resolve when {@link notifyLabGameSidecarSummarizeDone} runs for this session (or timeout). */
export function waitForLabGameSidecarSummarize(
  sessionId: string,
  timeoutMs = 120_000,
): Promise<'done' | 'timeout'> {
  const trimmed = sessionId.trim();
  return new Promise((resolve) => {
    const existing = waiters.get(trimmed);
    if (existing) {
      existing();
    }
    const timer = setTimeout(() => {
      waiters.delete(trimmed);
      resolve('timeout');
    }, timeoutMs);
    waiters.set(trimmed, () => {
      clearTimeout(timer);
      waiters.delete(trimmed);
      resolve('done');
    });
  });
}

export function notifyLabGameSidecarSummarizeDone(sessionId: string): void {
  const trimmed = sessionId.trim();
  waiters.get(trimmed)?.();
}
