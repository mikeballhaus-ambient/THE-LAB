/**
 * System-prompt appendix: signed-in Lab user's profile display name (`User.name`).
 * Used for Laboratory and Sidecar chat (not game snapshot JSON — that uses the same field separately).
 */

export function formatLabUserDisplayNameSystemAppendix(displayName: string): string {
  const trimmed = displayName.trim();
  return `

## Lab user display name

The signed-in user's Lab profile display name is **${trimmed}**.

- **Laboratory and Sidecar:** you may use their first name **rarely** for a personable tone — not in every reply, not multiple times in one message, and **never** as a default opener or sign-off.
- Do **not** put their display name in tool arguments, file paths, SQL, or API payloads unless they explicitly ask you to.
- During vs–Lab Assistant games, prefer game snapshot / table-talk rules when those layers are present: address them as **you** at the table; do **not** repeat their display name on proactive banter or Sidecar chat (e.g. avoid "Nice shot, ${trimmed.split(/\s+/)[0] ?? trimmed}" every pocket).`;
}

export function appendLabUserDisplayNameToSystemMessage(
  sysMsg: string,
  displayName?: string | null,
): string {
  const trimmed = displayName?.trim();
  if (!trimmed) {
    return sysMsg;
  }
  return `${sysMsg}${formatLabUserDisplayNameSystemAppendix(trimmed)}`;
}
