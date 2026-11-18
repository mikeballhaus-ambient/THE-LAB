import { extractLeakedToolCallsFromText } from '@/shared/utils/leaked-tool-call-extraction';

/**
 * Remove OpenAI-style native tool_call JSON that sometimes leaks into assistant
 * message text when tools run (Sidecar hides tool UI). Preserves fenced code blocks.
 */

function isOpenAiStyleToolCall(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  if (row.type !== 'function') {
    return false;
  }
  if (typeof row.id !== 'string' || row.id.trim() === '') {
    return false;
  }
  const fn = row.function;
  if (!fn || typeof fn !== 'object' || Array.isArray(fn)) {
    return false;
  }
  const func = fn as Record<string, unknown>;
  return typeof func.name === 'string' && func.name.trim().length > 0;
}

function isLeakedToolCallPayload(parsed: unknown): boolean {
  if (Array.isArray(parsed)) {
    return parsed.length > 0 && parsed.every((item) => isOpenAiStyleToolCall(item));
  }
  return isOpenAiStyleToolCall(parsed);
}

/** Find end index (exclusive) of a JSON array/object starting at `start`. */
function findJsonSpanEnd(text: string, start: number): number | null {
  const opener = text[start];
  if (opener !== '[' && opener !== '{') {
    return null;
  }
  const closer = opener === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === opener) {
      depth += 1;
    } else if (ch === closer) {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return null;
}

function stripLeadingLeakedToolCalls(segment: string): string {
  let rest = segment;
  for (;;) {
    rest = rest.trimStart();
    if (!rest.length) {
      return rest;
    }
    const first = rest[0];
    if (first !== '[' && first !== '{') {
      return rest;
    }
    const end = findJsonSpanEnd(rest, 0);
    if (end == null) {
      return rest;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rest.slice(0, end));
    } catch {
      return rest;
    }
    if (!isLeakedToolCallPayload(parsed)) {
      return rest;
    }
    rest = rest.slice(end).trimStart();
  }
}

const CODE_FENCE_PATTERN = /```[\s\S]*?```/g;

/**
 * Strip leaked native tool-call JSON from assistant-visible text.
 * Only removes tool-call-shaped JSON at segment starts (after whitespace).
 * Fenced ``` blocks are never modified.
 */
export function stripLeakedNativeToolCallsFromText(text: string): string {
  if (!text.includes('"type":"function"') && !text.includes('"type": "function"')) {
    return text;
  }

  const salvaged = extractLeakedToolCallsFromText(text, '');
  if (salvaged.extracted && salvaged.contentWithoutLeak !== text.trim()) {
    text = salvaged.contentWithoutLeak;
  }

  const parts: string[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CODE_FENCE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(stripLeadingLeakedToolCalls(text.slice(lastIndex, start)));
    }
    parts.push(match[0]);
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(stripLeadingLeakedToolCalls(text.slice(lastIndex)));
  }

  return parts.length > 0 ? parts.join('') : stripLeadingLeakedToolCalls(text);
}
