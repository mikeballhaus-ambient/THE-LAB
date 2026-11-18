import { Ref } from "vue";
import { useToast } from 'primevue/usetoast';
import { Socket } from 'socket.io-client';
import { LLMProviderConfig, ProviderFetchModelResponse, ProviderFetchModelRequest, ProviderTestResultEventData, ProviderConfigUpdateEventData, ProviderTestEventData, ProviderUpdateResultData } from '../../../shared/types';
import { SOCKET_EVENTS } from '../../../shared/types';

export function useProviderHandlers(
  availableChatModels: Ref<string[]>,
  availableEmbedModels: Ref<string[]>,
  llmProviderConfig: Ref<LLMProviderConfig | undefined>,
  socketConnection: Ref<Socket | null>
) {
  const toast = useToast();

  // ==================================================================
  // PROVIDER/LLM CONFIGURATION HANDLERS (socket-based, only in LabDashboard)
  // ==================================================================

  const fetchModelsRequestHandler = (config?: LLMProviderConfig) => {
    if (!socketConnection.value) return;
    const providerConfig = config ?? llmProviderConfig.value;
    if (!providerConfig) return;
    llmProviderConfig.value = providerConfig;
    socketConnection.value.emit(SOCKET_EVENTS.FETCH_MODELS_REQUEST, { providerConfig } as ProviderFetchModelRequest);
  };

  const fetchModelsResponseHandler = (data: ProviderFetchModelResponse) => {
    if (data.chatModels) {
      if (data.chatModels.length > 0) {
        availableChatModels.value = data.chatModels
        toast.add({ severity: 'success', summary: 'Chat Provider', detail: 'Available models have been updated', life: 3000 })
      } else {
        toast.add({ severity: 'error', summary: 'Chat Provider', detail: 'No models were loaded', life: 3000 })
      }
    }
    if (data.embedModels) {
      if (data.embedModels.length > 0) {
        availableEmbedModels.value = data.embedModels
        toast.add({ severity: 'success', summary: 'Embed Provider', detail: 'Available models have been updated', life: 3000 })
      } else {
        toast.add({ severity: 'error', summary: 'Embed Provider', detail: 'No models were loaded', life: 3000 })
      }
    }
  };

  const providerConfigUpdateHandlder = (_data?: ProviderUpdateResultData) => {
    void _data;
    toast.add({ severity: 'success', summary: 'Provider', detail: 'Provider settings saved!', life: 3000 })
  };

  const testProviderResultsUpdateHandlder = (data: ProviderTestResultEventData) => {
    if (data.chat.success) {
      toast.add({ severity: 'success', summary: 'Chat Provider Test', detail: 'Provider connection successful!', life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'Chat Provider Test', detail: data.chat.message || 'Connection test failed', life: 3000 })
    }
    if (data.embed.success) {
      toast.add({ severity: 'success', summary: 'Embedding Provider Test', detail: 'Provider connection successful!', life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'Embedding Provider Test', detail: data.embed.message || 'Connection test failed', life: 3000 })
    }
  };

  const handleProviderSave = async (llmProviderConfigUpdate: LLMProviderConfig | undefined, userId: number): Promise<void> => {
    if (!socketConnection.value) return;
    llmProviderConfig.value = llmProviderConfigUpdate
    socketConnection.value.emit(SOCKET_EVENTS.PROVIDER_CONFIG_UPDATE, { providerConfig: llmProviderConfigUpdate, userId } as ProviderConfigUpdateEventData)
  };

  const handleProviderTest = async (llmProviderConfigUpdate: LLMProviderConfig | undefined): Promise<void> => {
    if (!socketConnection.value) return;
    llmProviderConfig.value = llmProviderConfigUpdate
    socketConnection.value.emit(SOCKET_EVENTS.PROVIDER_TEST, { providerConfig: llmProviderConfigUpdate } as ProviderTestEventData)
  };

  return {
    fetchModelsRequestHandler,
    fetchModelsResponseHandler,
    providerConfigUpdateHandlder,
    testProviderResultsUpdateHandlder,
    handleProviderSave,
    handleProviderTest,
  };
}
