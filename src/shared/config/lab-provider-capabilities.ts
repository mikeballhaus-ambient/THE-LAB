import type { LLMProvider, ProviderConfigBase } from '../types';

export type ProviderProfile = 'ollama-local' | 'openai-cloud' | 'openai-compatible';

export interface ProviderCapabilities {
  profile: ProviderProfile;
  supportsStreaming: boolean;
  nativeToolCalls: boolean;
  /** Legacy full text scrape ([Tool Call] logs + OpenAI-shaped JSON in content). Off when native tools are used. */
  useTextToolExtraction: boolean;
  /** Always parse obvious tool JSON leaked into assistant text (common on local models). */
  useLeakedToolCallExtraction: boolean;
}

export function resolveProviderCapabilities(
  providerName: string,
  config?: Pick<ProviderConfigBase, 'baseUrl'>,
): ProviderCapabilities {
  if (providerName === 'Ollama') {
    return {
      profile: 'ollama-local',
      supportsStreaming: true,
      nativeToolCalls: true,
      useTextToolExtraction: false,
      useLeakedToolCallExtraction: true,
    };
  }

  if (providerName === 'LM Studio') {
    return {
      profile: 'openai-compatible',
      supportsStreaming: true,
      nativeToolCalls: true,
      useTextToolExtraction: false,
      useLeakedToolCallExtraction: true,
    };
  }

  const base = config?.baseUrl?.trim() ?? '';
  const isCloudOpenAi =
    !base ||
    base.includes('api.openai.com') ||
    base.endsWith('openai.com/v1') ||
    base.endsWith('openai.com/v1/');

  return {
    profile: isCloudOpenAi ? 'openai-cloud' : 'openai-compatible',
    supportsStreaming: true,
    nativeToolCalls: true,
    useTextToolExtraction: false,
    useLeakedToolCallExtraction: true,
  };
}

export function resolveProviderCapabilitiesFromAdapter(
  adapter: LLMProvider | undefined,
): ProviderCapabilities {
  if (!adapter) {
    return {
      profile: 'ollama-local',
      supportsStreaming: false,
      nativeToolCalls: false,
      useTextToolExtraction: false,
      useLeakedToolCallExtraction: true,
    };
  }
  const providerName = adapter.llmProviderConfig?.provider ?? adapter.getName();
  return resolveProviderCapabilities(providerName, adapter.llmProviderConfig);
}

export function resolveModelOutputParseOptions(adapter: LLMProvider | undefined): {
  allowTextToolExtraction: boolean;
  allowLeakedToolExtraction: boolean;
} {
  const caps = resolveProviderCapabilitiesFromAdapter(adapter);
  return {
    allowTextToolExtraction: caps.useTextToolExtraction,
    allowLeakedToolExtraction: caps.useLeakedToolCallExtraction,
  };
}
