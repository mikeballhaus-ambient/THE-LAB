import type { TemplateResolverFn } from './types';
import {
  buildCurrentPersonaSection,
  buildPersonasSection,
} from '../../../shared/config/lab-system-prompt';

/** Resolves active persona (compact). */
export const resolveCurrentPersonaTemplate: TemplateResolverFn = async (
  ctx,
  sessionId,
  persona,
) => {
  void sessionId;
  const personaConfig = ctx.personas.find((p) => p.name === persona);
  if (!personaConfig) {
    return '';
  }

  return buildCurrentPersonaSection(
    personaConfig.name,
    personaConfig.sysMsg.role,
    personaConfig.sysMsg.rules,
  );
};

/** Resolves persona list for switching. */
export const resolveAvailablePersonasTemplate: TemplateResolverFn = async (ctx) => {
  const names = ctx.personas.map((p) => p.name);
  return buildPersonasSection(names);
};
