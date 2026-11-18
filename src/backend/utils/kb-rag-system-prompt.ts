/** Append slot-A KB RAG appendix to an assembled system message (after integrations layers). */

export function appendKbRagAppendixToSystemMessage(sysMsg: string, appendix: string): string {
  const base = sysMsg.trimEnd();
  const extra = appendix.trim();
  if (!extra) {
    return base;
  }
  return `${base}\n\n${extra}`;
}