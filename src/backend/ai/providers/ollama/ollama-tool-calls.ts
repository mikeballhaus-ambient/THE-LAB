import crypto from 'node:crypto';
import type { MCPToolCall } from '@/shared/types';
import {
  mergeToolCallArgumentsJson,
  normalizeToolCallArgumentsString,
} from '@/shared/utils/chat-tool-calls';

/** Normalize Ollama `message.tool_calls` (batch or stream snapshot). */
export function normalizeOllamaToolCalls(raw: unknown): MCPToolCall[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const out: MCPToolCall[] = [];
  for (let i = 0; i < raw.length; i++) {
    const tc = raw[i] as Record<string, unknown>;
    const fn = tc.function as Record<string, unknown> | undefined;
    if (!fn || typeof fn.name !== 'string') {
      continue;
    }
    const id =
      typeof tc.id === 'string' && tc.id.trim()
        ? tc.id
        : `call_${i}_${crypto.randomUUID()}`;
    out.push({
      type: 'function',
      id,
      function: {
        name: fn.name,
        arguments: normalizeToolCallArgumentsString(fn.arguments),
      },
    });
  }
  return out;
}

/**
 * Merge incremental Ollama stream tool_call fragments (by array index).
 */
export function mergeOllamaStreamToolCalls(
  existing: MCPToolCall[],
  raw: unknown,
): { merged: MCPToolCall[]; changedIndex: number | null } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { merged: existing, changedIndex: null };
  }

  const merged = [...existing];
  let changedIndex: number | null = null;

  for (let i = 0; i < raw.length; i++) {
    const tc = raw[i] as Record<string, unknown>;
    const fn = tc.function as Record<string, unknown> | undefined;
    if (!fn) {
      continue;
    }

    const name = typeof fn.name === 'string' ? fn.name : '';
    if (!merged[i]) {
      if (!name) {
        continue;
      }
      const id =
        typeof tc.id === 'string' && tc.id.trim()
          ? tc.id
          : `call_${i}_${crypto.randomUUID()}`;
      merged[i] = {
        type: 'function',
        id,
        function: {
          name,
          arguments: normalizeToolCallArgumentsString(fn.arguments),
        },
      };
      changedIndex = i;
      continue;
    }

    const entry = merged[i];
    if (typeof tc.id === 'string' && tc.id.trim()) {
      entry.id = tc.id;
    }
    if (name) {
      entry.function.name = name;
    }
    if (fn.arguments !== undefined && fn.arguments !== null) {
      entry.function.arguments = mergeToolCallArgumentsJson(
        entry.function.arguments as string,
        fn.arguments,
      );
    }
    changedIndex = i;
  }

  return { merged, changedIndex };
}
