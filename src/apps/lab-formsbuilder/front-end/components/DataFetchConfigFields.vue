<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import type { FormComponent, DataFetchConfig, LookupContract } from '../../shared/types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  component?: FormComponent;
  connectorLookups: LookupContract[];
  dataFetchConfig?: DataFetchConfig;
  matchedLookup?: LookupContract;
  effectiveConfig?: DataFetchConfig;
  showConnectorLookupList: boolean;
  showFallbackHints?: boolean;
  testResults: { success: boolean; message: string; data?: unknown } | null;
  isTesting: boolean;
}>();

const emit = defineEmits<{
  (e: 'test'): void;
  (e: 'clear-results'): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const hasMatchedLookup = computed(() => Boolean(props.matchedLookup && !props.dataFetchConfig));
</script>

<template>
  <div
    v-if="effectiveConfig"
    class="mb-3 rounded-lg border border-lab-general-border bg-lab-general-bg-muted p-2.5"
  >
    <div class="text-xs font-semibold text-lab-general-text-muted uppercase tracking-wide mb-2">Lookup</div>
    <div class="mb-2 text-sm">
      <span class="text-lab-general-text-muted">For property:</span>
      <span class="font-medium ml-1">{{ effectiveConfig.forProperty || 'Not set' }}</span>
    </div>
    <div class="mb-2 text-sm">
      <span class="text-lab-general-text-muted">Endpoint:</span>
      <span class="font-mono text-xs ml-1 break-all">{{ effectiveConfig.endpoint?.url || 'Not configured' }}</span>
    </div>
    <p v-if="hasMatchedLookup" class="text-xs text-lab-general-text-muted m-0">
      Matched from linked connector (field key equals lookup property).
    </p>
  </div>

  <div
    v-else-if="showFallbackHints && showConnectorLookupList"
    class="mb-3 rounded-lg border border-lab-general-border bg-lab-general-bg-muted p-2.5"
  >
    <p class="text-xs text-lab-general-text-muted m-0 mb-2">
      No lookup for field key
      <span class="font-mono text-sky-300">{{ component?.fieldKey }}</span>.
      Available connector lookups:
    </p>
    <ul
      class="list-none m-0 p-0 space-y-2"
      :id="generateUniqueId('connector-lookup-options-list')"
    >
      <li
        v-for="lookup in connectorLookups"
        :key="lookup.forProperty"
        class="text-xs border border-lab-general-border rounded p-2"
      >
        <span class="text-sky-400 font-medium">{{ lookup.forProperty }}</span>
        <span class="block font-mono text-lab-general-text-muted break-all mt-1">{{ lookup.endpoint?.url || 'N/A' }}</span>
      </li>
    </ul>
  </div>

  <div v-else-if="showFallbackHints" class="text-sm text-lab-general-text-muted mb-3">
    No lookup configured for this field. Link a connector or use Autopopulate from model.
  </div>

  <Button
    v-if="effectiveConfig"
    label="Test endpoint"
    icon="pi pi-play"
    size="small"
    @click="emit('test')"
    :disabled="!effectiveConfig || isTesting"
    :loading="isTesting"
    :pt="{ root: { id: generateUniqueId('data-fetch-test-btn') } }"
  />

  <div v-if="testResults" class="mt-3">
    <div
      class="rounded-lg p-2 border text-sm mb-2"
      :class="testResults.success ? 'border-green-600 bg-green-950/40' : 'border-red-600 bg-red-950/40'"
    >
      <div class="font-medium mb-1">{{ testResults.success ? 'Success' : 'Error' }}</div>
      <div class="text-lab-general-text">{{ testResults.message }}</div>
      <pre
        v-if="testResults.data"
        class="text-xs mt-2 p-2 rounded bg-lab-general-bg-muted overflow-x-auto max-h-40"
      >{{ JSON.stringify(testResults.data, null, 2) }}</pre>
    </div>
    <Button
      label="Clear results"
      severity="secondary"
      size="small"
      icon="pi pi-times"
      @click="emit('clear-results')"
      :pt="{ root: { id: generateUniqueId('data-fetch-clear-results-btn') } }"
    />
  </div>
</template>
