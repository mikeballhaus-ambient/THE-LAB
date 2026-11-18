import { ref, watch, watchEffect } from 'vue';
import { LLMProviderConfig, AiProvider, ProviderConfigBase, LLMEmbedProviderConfig, LLMChatProviderConfig, User } from '../../../shared/types';
import { sanitizeLmStudioBaseUrl } from '../../utils/openai-compatible-base-url';

function normalizeSideBaseUrl(providerName: string, baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (providerName === 'LM Studio') {
    return sanitizeLmStudioBaseUrl(trimmed);
  }
  return trimmed;
}

function enrichProviderConfig(config: LLMProviderConfig, providers: AiProvider[]): LLMProviderConfig {
  const resolveName = (providerId: number, current: string) =>
    providers.find((p) => p.id === providerId)?.name ?? current;

  const chatProvider = resolveName(config.chat.providerId, config.chat.provider);
  const embedProvider = resolveName(config.embed.providerId, config.embed.provider);

  return {
    chat: {
      ...config.chat,
      provider: chatProvider,
      baseUrl: normalizeSideBaseUrl(chatProvider, config.chat.baseUrl),
    },
    embed: {
      ...config.embed,
      provider: embedProvider,
      baseUrl: normalizeSideBaseUrl(embedProvider, config.embed.baseUrl),
    },
  };
}

export const useApiManagement = (
  llmProviderConfig: () => LLMProviderConfig | undefined,
  providers: () => AiProvider[],
  testLLMProviderConnection: (llmProviderConfig: LLMProviderConfig | undefined) => Promise<void>,
  requestLLMModelList: (llmProviderConfig: LLMProviderConfig | undefined) => void,
  saveLLMProviderConfiguration: (llmProviderConfigUpdate: LLMProviderConfig | undefined, userId: number) => Promise<void>,
  user: () => User | null
) => {

  const apiTab = ref<'chat' | 'embed'>('chat');
  const _user = ref<User | null>()

  const form_llmProviderConfig = ref<LLMProviderConfig>({
    chat:
      {
        apiKey: "",
        baseUrl: "",
        id: 10,
        maxContext: "0",
        model: "",
        provider: "",
        providerId: 0,
        providerType: "chat"
      } as LLMChatProviderConfig,
    embed: {
      apiKey: "",
      baseUrl: "",
      id: 10,
      maxContext: "0",
      model: "",
      provider: "",
      providerId: 0,
      providerType: "embed"
    } as LLMEmbedProviderConfig
  })

  watchEffect(() => {
    const llmProviderConfigUpdate = llmProviderConfig()
    if (llmProviderConfigUpdate) form_llmProviderConfig.value = llmProviderConfigUpdate

    if (user()) _user.value = user()
  })

  watch(
    () => form_llmProviderConfig.value.chat.providerId,
    (providerId) => {
      const name = providers().find((p) => p.id === providerId)?.name;
      if (name) form_llmProviderConfig.value.chat.provider = name;
    },
  );

  watch(
    () => form_llmProviderConfig.value.embed.providerId,
    (providerId) => {
      const name = providers().find((p) => p.id === providerId)?.name;
      if (name) form_llmProviderConfig.value.embed.provider = name;
    },
  );

  const providerSupportsKey = (providerConfig: ProviderConfigBase): boolean => {
    if (!providerConfig.provider) return false;
    const aiProvider = providers().filter(_ => _.id == providerConfig.providerId)[0];
    if (aiProvider) {
      return aiProvider.supportsApiKey;
    } else {
      return false;
    }
  };

  const withEnrichedConfig = (): LLMProviderConfig =>
    enrichProviderConfig(form_llmProviderConfig.value, providers());

  const fetchModels = () => {
    requestLLMModelList(withEnrichedConfig());
  };

  const testProviderConnection = async () => {
    await testLLMProviderConnection(withEnrichedConfig());
  };

  const SaveProviderConnection = async () => {
    if (_user.value) await saveLLMProviderConfiguration(withEnrichedConfig(), _user.value.userId);
  };

  return {
    apiTab,
    providerSupportsKey,
    fetchModels,
    testProviderConnection,
    SaveProviderConnection,
    form_llmProviderConfig
  };
}
