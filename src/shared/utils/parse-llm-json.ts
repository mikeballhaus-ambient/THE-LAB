/**
 * Extract and parse JSON from model text (raw object or ```json fence).
 */
export function parseJsonFromModelText<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Empty model response');
  }
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(trimmed);
  const candidate = fence ? fence[1].trim() : trimmed;
  const parsed = tryParseJsonObject(candidate);
  if (parsed != null) {
    return parsed as T;
  }
  throw new Error('No valid JSON object in model response');
}

const MOVE_TYPE_JSON_RE =
  /\{\s*["']type["']\s*:\s*["'](?:place|pass|exchange|resign)["']/g;

const THINKING_PREAMBLE_RE =
  /^(?:thinking\s*process|analysis|reasoning)\s*[:.]?\s*/i;

/** Extract one balanced `{...}` object starting at `openBraceIndex`, or null if truncated. */
export function extractBalancedJsonObject(text: string, openBraceIndex: number): string | null {
  if (openBraceIndex < 0 || text[openBraceIndex] !== '{') {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openBraceIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openBraceIndex, i + 1);
      }
    }
  }
  return null;
}

function tryParseJsonObject(candidate: string): unknown | null {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace < 0) {
    return null;
  }
  const starts = collectMoveObjectStartIndices(trimmed);
  const indices = starts.length > 0 ? starts : [firstBrace];
  for (let i = indices.length - 1; i >= 0; i--) {
    const balanced = extractBalancedJsonObject(trimmed, indices[i]!);
    if (!balanced) {
      continue;
    }
    try {
      return JSON.parse(balanced) as unknown;
    } catch {
      continue;
    }
  }
  return null;
}

function collectMoveObjectStartIndices(text: string): number[] {
  const indices: number[] = [];
  for (const match of text.matchAll(MOVE_TYPE_JSON_RE)) {
    if (match.index != null) {
      indices.push(match.index);
    }
  }
  return indices;
}

/** Drop Qwen-style thinking preambles when thinking was not fully disabled at the provider. */
export function stripAgentThinkingPreamble(text: string): string {
  let t = text.trim();
  const thinkSplit = t.split(/<\/think>/i);
  if (thinkSplit.length > 1) {
    t = thinkSplit[thinkSplit.length - 1]!.trim();
  }
  const redactedSplit = t.split(/<\/redacted_reasoning>/i);
  if (redactedSplit.length > 1) {
    t = redactedSplit[redactedSplit.length - 1]!.trim();
  }
  const fenceIdx = t.search(/```(?:json)?/i);
  if (fenceIdx > 0) {
    return t.slice(fenceIdx).trim();
  }
  if (THINKING_PREAMBLE_RE.test(t)) {
    const brace = t.indexOf('{');
    if (brace > 0) {
      t = t.slice(brace).trim();
    }
  }
  const moveStarts = collectMoveObjectStartIndices(t);
  const lastMoveStart = moveStarts.length > 0 ? moveStarts[moveStarts.length - 1]! : -1;
  if (lastMoveStart > 0) {
    return t.slice(lastMoveStart).trim();
  }
  return t;
}

function parseMoveFromPreparedText<T>(text: string): T {
  const parsed = tryParseJsonObject(text);
  if (parsed != null) {
    return parsed as T;
  }
  const moveStarts = collectMoveObjectStartIndices(text);
  if (moveStarts.length > 0) {
    const last = moveStarts[moveStarts.length - 1]!;
    if (!extractBalancedJsonObject(text, last)) {
      throw new Error(
        'Incomplete move JSON (model may have hit the token limit or stopped mid-object)',
      );
    }
  }
  throw new Error('No move JSON found in model response');
}

/**
 * Prefer the last move-shaped JSON object (reasoning prose often contains `{` earlier in the reply).
 */
export function parseMoveJsonFromModelText<T>(text: string): T {
  const trimmed = stripAgentThinkingPreamble(text);
  if (!trimmed) {
    throw new Error('Empty model response');
  }

  const fences = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (let i = fences.length - 1; i >= 0; i--) {
    try {
      return parseMoveFromPreparedText<T>(fences[i]![1]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Incomplete move JSON')) {
        throw e;
      }
    }
  }

  const unclosedFence = /```(?:json)?\s*([\s\S]+)$/i.exec(trimmed);
  if (unclosedFence) {
    try {
      return parseMoveFromPreparedText<T>(unclosedFence[1]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Incomplete move JSON')) {
        throw e;
      }
    }
  }

  return parseMoveFromPreparedText<T>(trimmed);
}
