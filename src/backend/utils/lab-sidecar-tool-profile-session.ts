/**
 * Per-chat-session Sidecar tool allowlist (narrower than persona) for rm-63 App Builder.
 */
const allowlistBySession = new Map<string, ReadonlySet<string>>();

export function setLabSidecarSessionToolAllowlist(
  sessionId: string,
  toolIds: readonly string[] | null,
): void {
  if (!toolIds || toolIds.length === 0) {
    allowlistBySession.delete(sessionId);
    return;
  }
  allowlistBySession.set(sessionId, new Set(toolIds));
}

export function clearLabSidecarSessionToolAllowlist(sessionId: string): void {
  allowlistBySession.delete(sessionId);
}

/** When a session has an allowlist, the tool must be listed (in addition to persona checks). */
export function isToolAllowedForLabSidecarSession(sessionId: string, toolId: string): boolean {
  const allowlist = allowlistBySession.get(sessionId);
  if (!allowlist) {
    return true;
  }
  return allowlist.has(toolId);
}
