import { OllamaAdapter } from './providers/ollama-provider';
import { OpenAIAdapter } from './providers/openai-provider';
import { LmStudioAdapter } from './providers/lm-studio-provider';
import type { LLMProvider, ProviderConfigBase } from '../../shared/types';
import {
  resolveProviderCapabilitiesFromAdapter,
  resolveProviderCapabilities,
} from '../../shared/config/lab-provider-capabilities';
import { aiProviderService } from '../db/AIProvider/ai-provider-service';

function resolveProviderName(config: ProviderConfigBase): string {
  if (config.provider?.trim()) {
    return config.provider.trim();
  }
  if (config.providerId) {
    return aiProviderService.getProviderById(config.providerId)?.name ?? '';
  }
  return '';
}

/**
 * Single construction path for chat/embed LLM adapters (rm-46 **2.9**).
 * Chat request options: all adapters must implement {@link LLMProvider.resolveChatRequestOptions}
 * (delegating to `mapChatRequestPayload()` in `providers/shared/chat-request-payload.ts`).
 */
export function buildProviderAdapter(
  llmProviderConfig: ProviderConfigBase | undefined,
): LLMProvider | undefined {
  if (!llmProviderConfig) {
    return undefined;
  }
  const providerName = resolveProviderName(llmProviderConfig);
  const configWithProvider: ProviderConfigBase = providerName
    ? { ...llmProviderConfig, provider: providerName }
    : llmProviderConfig;

  switch (providerName) {
    case 'Ollama':
      return new OllamaAdapter(configWithProvider);
    case 'LM Studio':
      return new LmStudioAdapter(configWithProvider);
    case 'OpenAI':
      return new OpenAIAdapter(configWithProvider);
    default:
      return undefined;
  }
}

/** Uses capability matrix (rm-46 **2.8**). */
export function adapterSupportsStreaming(adapter: LLMProvider | undefined): boolean {
  return resolveProviderCapabilitiesFromAdapter(adapter).supportsStreaming;
}

/** Alias used by ProviderService (rm-46 2.9). */
export const createProviderAdapter = buildProviderAdapter;

export function getStreamFallbackNotice(adapter: LLMProvider): string {
  const caps = resolveProviderCapabilities(adapter.getName(), adapter.llmProviderConfig);
  if (caps.supportsStreaming) {
    return `Streaming is not available for the current request; using standard response mode.`;
  }
  return `Streaming is not supported for ${adapter.getName()} (${caps.profile}); using standard response mode.`;
}
