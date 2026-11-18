import type { MCPToolCall } from '@/shared/types';
import { isLeakedToolCallDebugEnabled } from '@/shared/utils/leaked-tool-call-debug';

export interface LeakedToolCallExtractionResult {
  toolCalls: MCPToolCall[];
  contentWithoutLeak: string;
  extracted: boolean;
}

const ARRAY_START_MARKERS = ['[{"id":', '[{"type":', '[{"name":', '[{"function":'];

/** End index (exclusive) of a JSON array starting at `start` (must be `[`). */
function findJsonArrayEnd(text: string, start: number): number | null {
  if (text[start] !== '[') {
    return null;
  }
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
    if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return null;
}

function buildLeakedArrayParseCandidates(trimmed: string): string[] {
  const candidates = new Set<string>();
  candidates.add(trimmed);

  // Common local-model typo: valid `[...]` plus one or more stray `}` after the closing `]`.
  const withoutTrailingBracesAfterBracket = trimmed.replace(/\](\s*\})+\s*$/u, ']');
  if (withoutTrailingBracesAfterBracket !== trimmed) {
    candidates.add(withoutTrailingBracesAfterBracket);
    const lb = withoutTrailingBracesAfterBracket.lastIndexOf(']');
    if (lb > 0) {
      candidates.add(
        `${withoutTrailingBracesAfterBracket.slice(0, lb)}}${withoutTrailingBracesAfterBracket.slice(lb)}`,
      );
    }
  }

  // Truncated leak: closed objects but missing outer `]`.
  if (!trimmed.endsWith(']') && trimmed.startsWith('[')) {
    candidates.add(`${trimmed}]`);
    const trimmedBraces = trimmed.replace(/\}+\s*$/u, '');
    if (trimmedBraces !== trimmed) {
      candidates.add(`${trimmedBraces}]`);
    }
  }

  // Ollama: often omits one `}` before the closing `]` of the outer tool-call array.
  const lastBracket = trimmed.lastIndexOf(']');
  if (lastBracket > 0) {
    candidates.add(`${trimmed.slice(0, lastBracket)}}${trimmed.slice(lastBracket)}`);
  }

  // Missing closing `"` on `arguments` string before function `}` — e.g. …"Edit"}}] → …"Edit"}"}]
  if (trimmed.includes('"arguments"') && /\}\}\]\s*$/u.test(trimmed)) {
    candidates.add(trimmed.replace(/\}\}\]\s*$/u, '}"}]'));
    candidates.add(trimmed.replace(/\\"(\s*)\}\}(\s*)\]$/u, '\\"}"}}]'));
  }

  return [...candidates];
}

/** Parse `function.arguments` when the model double-closes JSON or truncates the envelope. */
function parseLeakedFunctionArguments(args: string): Record<string, unknown> | null {
  const trimmed = args.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  const candidates = new Set<string>();
  candidates.add(trimmed);
  let t = trimmed;
  for (let i = 0; i < 4 && t.endsWith('}'); i += 1) {
    candidates.add(t);
    t = t.slice(0, -1);
    candidates.add(t);
  }
  if (!trimmed.endsWith('}')) {
    candidates.add(`${trimmed}}`);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // next candidate
    }
  }
  return null;
}

function tryParseJsonArray(candidate: string): unknown[] | null {
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('[')) {
    return null;
  }

  for (const attempt of buildLeakedArrayParseCandidates(trimmed)) {
    try {
      const parsed = JSON.parse(attempt) as unknown;
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // try next repair candidate
    }
  }
  return null;
}

function findJsonArraySpan(text: string): { start: number; end: number } | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    const start = text.indexOf('[');
    const end = findJsonArrayEnd(text, start);
    if (end != null && end > start) {
      return { start, end };
    }
    const tail = text.slice(start).trimEnd();
    if (tryParseJsonArray(tail)) {
      return { start, end: start + tail.length };
    }
  }

  for (const marker of ARRAY_START_MARKERS) {
    const start = text.indexOf(marker);
    if (start === -1) {
      continue;
    }
    const end = findJsonArrayEnd(text, start);
    if (end != null && end > start) {
      return { start, end };
    }
    const tail = text.slice(start).trimEnd();
    if (tryParseJsonArray(tail)) {
      return { start, end: start + tail.length };
    }
  }
  return null;
}

function normalizeLeakedItemToToolCall(item: unknown, index: number): MCPToolCall | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }
  const record = item as Record<string, unknown>;

  if (record.function && typeof record.function === 'object') {
    const fn = record.function as Record<string, unknown>;
    const name = typeof fn.name === 'string' ? fn.name.trim() : '';
    if (!name) {
      return null;
    }
    let args = fn.arguments;
    if (typeof args === 'string') {
      const parsedArgs = parseLeakedFunctionArguments(args);
      if (!parsedArgs) {
        return null;
      }
      args = parsedArgs;
    }
    if (args === undefined || typeof args !== 'object' || args === null || Array.isArray(args)) {
      return null;
    }
    return {
      id: typeof record.id === 'string' ? record.id : `call_leak_${index}_${Math.random().toString(36).slice(2, 9)}`,
      type: 'function',
      function: { name, arguments: JSON.stringify(args) },
    };
  }

  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {
    return null;
  }

  const params = record.parameters ?? record.arguments ?? record.params;
  if (params === undefined || typeof params !== 'object' || params === null || Array.isArray(params)) {
    return null;
  }

  return {
    id: typeof record.id === 'string' ? record.id : `call_leak_${index}_${Math.random().toString(36).slice(2, 9)}`,
    type: 'function',
    function: { name, arguments: JSON.stringify(params) },
  };
}

/**
 * When models with native tool support still emit tool JSON in assistant text
 * (common Ollama shape: `[{"name":"tool_id","parameters":{...}}]`).
 */
export function extractLeakedToolCallsFromText(
  rawContent: string = '',
  rawReasoning: string = '',
): LeakedToolCallExtractionResult {
  const combined = `${rawReasoning.trim()}\n${rawContent.trim()}`.trim();
  if (!combined) {
    return { toolCalls: [], contentWithoutLeak: rawContent.trim(), extracted: false };
  }

  const span = findJsonArraySpan(combined);
  if (!span) {
    return { toolCalls: [], contentWithoutLeak: rawContent.trim(), extracted: false };
  }

  const arrayString = combined.slice(span.start, span.end);
  const parsedArray = tryParseJsonArray(arrayString);
  if (!parsedArray?.length) {
    if (isLeakedToolCallDebugEnabled()) {
      console.warn('[leaked-tool-call] array JSON parse failed after repair candidates', {
        tail: arrayString.slice(-96),
      });
    }
    return { toolCalls: [], contentWithoutLeak: rawContent.trim(), extracted: false };
  }

  const toolCalls: MCPToolCall[] = [];
  for (let i = 0; i < parsedArray.length; i += 1) {
    const call = normalizeLeakedItemToToolCall(parsedArray[i], i);
    if (call) {
      toolCalls.push(call);
    }
  }

  if (toolCalls.length === 0) {
    if (isLeakedToolCallDebugEnabled()) {
      console.warn('[leaked-tool-call] array parsed but no tool calls normalized', {
        items: parsedArray.length,
      });
    }
    return { toolCalls: [], contentWithoutLeak: rawContent.trim(), extracted: false };
  }

  let contentWithoutLeak = rawContent.trim();
  const contentSpan = findJsonArraySpan(contentWithoutLeak);
  if (contentSpan) {
    const before = contentWithoutLeak.slice(0, contentSpan.start).trim();
    const after = contentWithoutLeak.slice(contentSpan.end).trim();
    contentWithoutLeak = [before, after].filter(Boolean).join('\n\n').trim();
  }

  return { toolCalls, contentWithoutLeak, extracted: true };
}

/** Remove a leaked `[{"id":...}]` tool envelope from visible assistant text. */
export function stripAssistantToolCallJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  const span = findJsonArraySpan(trimmed);
  if (!span) {
    return trimmed;
  }
  const before = trimmed.slice(0, span.start).trim();
  const after = trimmed.slice(span.end).trim();
  return [before, after].filter(Boolean).join('\n\n').trim();
}

export function assistantTextLooksLikeToolCallLeak(text: string): boolean {
  return findJsonArraySpan(text.trim()) != null;
}
