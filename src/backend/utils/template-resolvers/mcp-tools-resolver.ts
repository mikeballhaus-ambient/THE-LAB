import z from 'zod';
import type { MCPToolInterface } from '../../../shared/types';
import type { TemplateResolverFn } from './types';
import { buildMcpToolsSection } from '../../../shared/config/lab-system-prompt';
import { mergePersonaUniversalTools } from '@/shared/constants/lab-session-todo-tools';

/** Resolves MCP tool ids for the active persona (schemas live on the provider API when enabled). */
export const resolveAvailableMcpToolsTemplate: TemplateResolverFn = async (
  ctx,
  sessionId,
  persona,
  _isDeveloperMode,
  _providerData,
  _templateData,
  mcpUtils,
) => {
  const personaConfig = ctx.personas.find((p) => p.name === persona);
  if (!personaConfig) {
    return '';
  }

  const allTools = mcpUtils.fetchToolList(ctx.userId, sessionId);
  const personaToolAllowlist = new Set(mergePersonaUniversalTools(personaConfig.tools));
  const allowedTools = allTools.filter((tool) => personaToolAllowlist.has(tool.id));
  const sortedAllowedTools = [...allowedTools].sort(
    (a: MCPToolInterface<z.ZodObject<z.ZodRawShape>>, b: MCPToolInterface<z.ZodObject<z.ZodRawShape>>) => {
      const aProp = a.display || a.name || '';
      const bProp = b.display || b.name || '';
      return aProp.localeCompare(bProp);
    },
  );

  if (sortedAllowedTools.length === 0) {
    return '';
  }

  return buildMcpToolsSection(
    sortedAllowedTools.map((t) => t.id),
    ctx.nativeToolCalls,
  );
};
