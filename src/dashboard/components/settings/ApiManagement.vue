<script setup lang="ts">
import { useApiManagement } from '../../../shared/composables/components/useApiManagement';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { AiProvider, LLMProviderConfig, User } from '../../../shared/types';
import { computed } from 'vue';

const props = defineProps<{
  llmProviderConfig: LLMProviderConfig | undefined;
  providers: AiProvider[];
  user: User | null;
  availableChatModels: string[];
  availableEmbedModels: string[];
  testLLMProviderConnection: (llmProviderConfig: LLMProviderConfig | undefined) => Promise<void>;
  requestLLMModelList: (llmProviderConfig: LLMProviderConfig | undefined) => void;
  saveLLMProviderConfiguration: (llmProviderConfigUpdate: LLMProviderConfig | undefined, userId: number) => Promise<void>;
}>();

const {
  apiTab,
  providerSupportsKey,
  fetchModels,
  testProviderConnection,
  SaveProviderConnection,
  form_llmProviderConfig,
} = useApiManagement(
  () => props.llmProviderConfig,
  () => props.providers,
  props.testLLMProviderConnection,
  props.requestLLMModelList,
  props.saveLLMProviderConfiguration,
  () => props.user,
);

const ollamaUrlPlaceholder = computed(() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost';
  return `${baseUrl}:11434`;
});

function urlPlaceholderForProviderId(providerId: number | undefined): string {
  const p = props.providers.find((x) => x.id === providerId);
  if (p?.name === 'LM Studio') {
    return p.baseUrl || 'http://127.0.0.1:1234';
  }
  if (p?.name === 'OpenAI') {
    return p.baseUrl || 'https://api.openai.com/v1';
  }
  return ollamaUrlPlaceholder.value;
}

const chatUrlPlaceholder = computed(() =>
  urlPlaceholderForProviderId(form_llmProviderConfig.value?.chat?.providerId),
);

const embedUrlPlaceholder = computed(() =>
  urlPlaceholderForProviderId(form_llmProviderConfig.value?.embed?.providerId),
);
</script>

<template>
  <div class="lab-settings-api">
    <div class="lab-settings-segment" role="tablist" aria-label="API configuration mode">
      <button
        type="button"
        role="tab"
        class="lab-settings-segment__btn"
        :class="{ 'lab-settings-segment__btn--active': apiTab === 'chat' }"
        :aria-selected="apiTab === 'chat'"
        @click="apiTab = 'chat'"
      >
        <i class="fa-solid fa-comment-dots" aria-hidden="true" />
        Chat LLM
      </button>
      <button
        type="button"
        role="tab"
        class="lab-settings-segment__btn"
        :class="{ 'lab-settings-segment__btn--active': apiTab === 'embed' }"
        :aria-selected="apiTab === 'embed'"
        @click="apiTab = 'embed'"
      >
        <i class="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
        Embedding LLM
      </button>
    </div>

    <div v-show="apiTab === 'chat'" class="lab-settings-api__form" role="tabpanel">
      <div class="lab-settings-form-grid">
        <div class="lab-settings-form-row">
          <label for="api-chat-provider" class="lab-settings-label">Provider</label>
          <Select
            id="api-chat-provider"
            v-model="form_llmProviderConfig.chat.providerId"
            placeholder="Select Provider"
            :options="props.providers"
            option-label="name"
            option-value="id"
            class="lab-settings-input lab-settings-field"
          />
        </div>
        <div class="lab-settings-form-row">
          <label for="api-chat-url" class="lab-settings-label">URL</label>
          <InputText
            id="api-chat-url"
            v-model="form_llmProviderConfig.chat.baseUrl"
            type="text"
            :placeholder="chatUrlPlaceholder"
            class="lab-settings-input lab-settings-field"
          />
        </div>
        <div v-show="providerSupportsKey(form_llmProviderConfig.chat)" class="lab-settings-form-row">
          <label for="api-chat-key" class="lab-settings-label">API key</label>
          <InputText
            id="api-chat-key"
            v-model="form_llmProviderConfig.chat.apiKey"
            type="password"
            placeholder="Enter API key"
            class="lab-settings-input lab-settings-field"
          />
        </div>
        <div class="lab-settings-form-row lab-settings-form-row--model">
          <label for="api-chat-model" class="lab-settings-label">Model</label>
          <Select
            id="api-chat-model"
            v-model="form_llmProviderConfig.chat.model"
            :options="props.availableChatModels"
            placeholder="Select Model"
            class="lab-settings-input lab-settings-field"
          />
          <Button size="small" label="Fetch Models" type="button" @click="fetchModels" />
        </div>
        <div class="lab-settings-form-row">
          <label for="api-chat-maxContext" class="lab-settings-label">Context length</label>
          <InputText
            id="api-chat-maxContext"
            v-model="form_llmProviderConfig.chat.maxContext"
            type="text"
            placeholder="98304"
            class="lab-settings-input lab-settings-field"
          />
        </div>
      </div>
      <div class="lab-settings-form-actions">
        <Button size="small" label="Test Connection" type="button" @click="testProviderConnection" />
        <Button size="small" label="Save Configuration" type="button" @click="SaveProviderConnection" />
      </div>
    </div>

    <div v-show="apiTab === 'embed'" class="lab-settings-api__form" role="tabpanel">
      <div class="lab-settings-form-grid">
        <div class="lab-settings-form-row">
          <label for="api-embed-provider" class="lab-settings-label">Provider</label>
          <Select
            id="api-embed-provider"
            v-model="form_llmProviderConfig.embed.providerId"
            :options="props.providers"
            placeholder="Select Provider"
            option-label="name"
            option-value="id"
            class="lab-settings-input lab-settings-field"
          />
        </div>
        <div class="lab-settings-form-row">
          <label for="api-embed-url" class="lab-settings-label">URL</label>
          <InputText
            id="api-embed-url"
            v-model="form_llmProviderConfig.embed.baseUrl"
            type="text"
            :placeholder="embedUrlPlaceholder"
            class="lab-settings-input lab-settings-field"
          />
        </div>
        <div v-show="providerSupportsKey(form_llmProviderConfig.embed)" class="lab-settings-form-row">
          <label for="api-embed-key" class="lab-settings-label">API key</label>
          <InputText
            id="api-embed-key"
            v-model="form_llmProviderConfig.embed.apiKey"
            type="password"
            placeholder="Enter API key"
            class="lab-settings-input lab-settings-field"
          />
        </div>
        <div class="lab-settings-form-row lab-settings-form-row--model">
          <label for="api-embed-model" class="lab-settings-label">Model</label>
          <Select
            id="api-embed-model"
            v-model="form_llmProviderConfig.embed.model"
            :options="props.availableEmbedModels"
            placeholder="Select Model"
            class="lab-settings-input lab-settings-field"
          />
          <Button size="small" label="Fetch Models" type="button" @click="fetchModels" />
        </div>
        <div class="lab-settings-form-row">
          <label for="api-embed-maxContext" class="lab-settings-label">Context length</label>
          <InputText
            id="api-embed-maxContext"
            v-model="form_llmProviderConfig.embed.maxContext"
            type="text"
            placeholder="98304"
            class="lab-settings-input lab-settings-field"
          />
        </div>
      </div>
      <div class="lab-settings-form-actions">
        <Button size="small" label="Test Connection" type="button" @click="testProviderConnection" />
        <Button size="small" label="Save Configuration" type="button" @click="SaveProviderConnection" />
      </div>
    </div>
  </div>
</template>
