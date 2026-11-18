import type {
  ChatPersona,
  ICommand,
  Persona,
  ProviderData,
  User,
} from '../../../shared/types';
import type { MCPUtils } from '../mcp-utils';

/** Shared DB/user state for template placeholder resolvers (rm-46 **4.4**). */
export interface TemplateResolverContext {
  userId: number;
  user: User | null;
  personas: Persona[];
  commands: ICommand[];
  nativeToolCalls: boolean;
}

export type TemplateResolverFn = (
  ctx: TemplateResolverContext,
  sessionId: string,
  persona: ChatPersona,
  isDeveloperMode: boolean,
  providerData: ProviderData,
  templateData: string,
  mcpUtils: MCPUtils,
) => Promise<string>;
