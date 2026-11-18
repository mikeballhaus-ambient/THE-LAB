<script setup lang="ts">
import { ref, computed } from 'vue';
import Card from 'primevue/card';
import type { FormComponent, DataFetchConfig, LookupContract, DataConnector } from '../../shared/types';
import DataFetchConfigFields from './DataFetchConfigFields.vue';
import { resolveEffectiveDataFetch, resolveLookupFetchUrl } from '../utils/data-fetch-utils';
import {
  lookupFetchInit,
  mapLookupResponseToOptions,
  type LookupOption,
} from '../utils/lookup-options';

const props = withDefaults(
  defineProps<{
    component?: FormComponent;
    linkedConnector?: DataConnector | null;
    embedded?: boolean;
    connectorLookups?: LookupContract[];
  }>(),
  {
    component: undefined,
    linkedConnector: null,
    embedded: false,
    connectorLookups: () => [],
  },
);

const emit = defineEmits<{
  (e: 'lookup-options', options: LookupOption[]): void;
}>();

const testResults = ref<{ success: boolean; message: string; data?: unknown } | null>(null);
const isTesting = ref(false);

const currentComponent = computed(() => props.component || { type: '', dataFetch: undefined });

const dataFetchConfig = computed<DataFetchConfig | undefined>(() => {
  const df = props.component?.dataFetch;
  return df && typeof df === 'object' ? df : undefined;
});

const matchedLookup = computed(() => {
  const key = props.component?.fieldKey;
  if (!key || !props.connectorLookups?.length) {
    return undefined;
  }
  return props.connectorLookups.find(l => l.forProperty === key);
});

const effectiveConfig = computed<DataFetchConfig | undefined>(() =>
  resolveEffectiveDataFetch(props.component, props.connectorLookups ?? []),
);

const showConnectorLookupList = computed(
  () => !effectiveConfig.value && (props.connectorLookups?.length ?? 0) > 0,
);

async function testEndpoint(): Promise<void> {
  if (!effectiveConfig.value) {
    testResults.value = { success: false, message: 'No data fetch configuration available' };
    return;
  }

  isTesting.value = true;
  testResults.value = null;

  try {
    const endpoint = effectiveConfig.value.endpoint;
    const url = endpoint?.url;
    if (!url) {
      testResults.value = { success: false, message: 'No lookup URL configured' };
      return;
    }

    const fullUrl = resolveLookupFetchUrl(props.linkedConnector, url);

    const response = await fetch(fullUrl, lookupFetchInit());
    const data = await response.json();
    const options = response.ok ? mapLookupResponseToOptions(data) : [];

    testResults.value = {
      success: response.ok,
      message: response.ok
        ? `Successfully tested endpoint: ${effectiveConfig.value.forProperty || 'N/A'}`
        : `Endpoint returned ${response.status}`,
      data,
    };

    if (response.ok && options.length > 0) {
      emit('lookup-options', options);
    }
  } catch (error) {
    testResults.value = {
      success: false,
      message: `Error testing endpoint: ${String(error)}`,
    };
  } finally {
    isTesting.value = false;
  }
}

function resetTestResults(): void {
  testResults.value = null;
  isTesting.value = false;
}

const sharedFieldProps = computed(() => ({
  component: props.component,
  connectorLookups: props.connectorLookups ?? [],
  dataFetchConfig: dataFetchConfig.value,
  matchedLookup: matchedLookup.value,
  effectiveConfig: effectiveConfig.value,
  showConnectorLookupList: showConnectorLookupList.value,
  testResults: testResults.value,
  isTesting: isTesting.value,
}));
</script>

<template>
  <Card v-if="!embedded" class="shrink-0">
    <template #title>Data Fetch Configuration</template>
    <template #content>
      <div v-if="currentComponent.type" class="flex flex-col gap-2">
        <DataFetchConfigFields
          v-bind="sharedFieldProps"
          :show-fallback-hints="!embedded"
          @test="testEndpoint"
          @clear-results="resetTestResults"
        />
      </div>
      <div v-else class="text-lab-general-text-muted text-center py-8">
        Select a component to view its data fetch configuration
      </div>
    </template>
  </Card>

  <div v-else-if="currentComponent.type" class="flex flex-col gap-2">
    <DataFetchConfigFields
      v-bind="sharedFieldProps"
      :show-fallback-hints="false"
      @test="testEndpoint"
      @clear-results="resetTestResults"
    />
  </div>
</template>
