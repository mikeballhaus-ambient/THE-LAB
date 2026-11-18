import type { MCPToolInterface } from '@/shared/types/mcp-tools';
import type { z } from 'zod';
import { GAME_AGENT_TOOLS } from './game-agent-tools';

/**
 * Id of a server-resolved structural tool.
 *
 * Open by design: each game app contributes its own tool id at boot via
 * `registerStructuralToolFromApp()`. Widening this (previously a single-member
 * union) is what lets more than one game use the agent-loop retry contract.
 */
export type PlatformStructuralToolId = string;

export interface PlatformStructuralToolRegistration {
  id: PlatformStructuralToolId;
  tool: MCPToolInterface<z.ZodTypeAny>;
  suppressReasoning?: boolean;
  purposeMatches: (purpose: string) => boolean;
}

const registrations = new Map<PlatformStructuralToolId, PlatformStructuralToolRegistration>();

export function registerPlatformStructuralTool(entry: PlatformStructuralToolRegistration): void {
  registrations.set(entry.id, entry);
}

export function clearPlatformStructuralToolsForTests(): void {
  registrations.clear();
}

export function resolvePlatformStructuralTools(
  toolId: PlatformStructuralToolId,
): MCPToolInterface<z.ZodTypeAny>[] {
  const entry = registrations.get(toolId);
  return entry ? [entry.tool] : [];
}

export function isPlatformStructuralToolId(value: string): value is PlatformStructuralToolId {
  return registrations.has(value as PlatformStructuralToolId);
}

export function platformStructuralToolSuppressesReasoning(purpose: string): boolean {
  for (const entry of registrations.values()) {
    if (entry.suppressReasoning && entry.purposeMatches(purpose)) {
      return true;
    }
  }
  return false;
}

export function registerDefaultPlatformStructuralTools(): void {
  for (const entry of GAME_AGENT_TOOLS) {
    if (registrations.has(entry.descriptor.id)) {
      continue;
    }
    registerStructuralToolFromApp(entry.descriptor, entry.purposeSuffix);
  }
}

/**
 * A structural tool as described by the **game app that owns it**.
 *
 * The provider only needs `id`, `description` and a Zod `params` schema; `execute`
 * is never called (the move is graded by the app's adapter, not by the platform).
 * So the schema belongs in `src/apps/{app}/shared/` and core only needs this
 * descriptor — no core may import `src/apps/**` (AGENTS.md #10).
 */
export interface StructuralToolDescriptor {
  id: string;
  description: string;
  params: z.ZodTypeAny;
}

/**
 * Register an app-owned structural tool.
 *
 * `purposeSuffix` scopes the tool to that app's agent turns, e.g.
 * `'.tic-tac-toe.agent-turn'` — purpose is `{slug}.{gameId}.agent-turn`.
 */
export function registerStructuralToolFromApp(
  descriptor: StructuralToolDescriptor,
  purposeSuffix: string,
): void {
  registerPlatformStructuralTool({
    id: descriptor.id,
    tool: {
      id: descriptor.id,
      name: descriptor.description.slice(0, 60),
      description: descriptor.description,
      params: descriptor.params,
      execute: async () => ({
        type: 'tool_result',
        tool_call_id: 'structural-stub',
        function: descriptor.id,
        success: true,
        content: 'Structural tool — not executed on server.',
      }),
    } as MCPToolInterface<z.ZodTypeAny>,
    suppressReasoning: true,
    purposeMatches: (purpose) => purpose.endsWith(purposeSuffix),
  });
}
