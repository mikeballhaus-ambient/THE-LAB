<script setup lang="ts">
/** Prefer Tailwind + `lab-*` for layout/chrome; avoid new scoped `<style>` (see docs/platform/lab-vue-style-exemptions.md). */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Badge from 'primevue/badge';
import { useToast } from 'primevue/usetoast';
import { SOCKET_EVENTS } from '../shared/types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();

interface Props {
  serverUrl?: string;
  /** Forms Builder API base — injected by THE-LAB when the app mounts */
  formsBuilderUrl?: string;
  /** Registry description from THE-LAB AppLifecycle mount */
  appDescription?: string;
}

const serverEnabled = ref<boolean>(true) //value to be set by template generator
const props = defineProps<Props>();
const socket = ref<ReturnType<typeof io> | null>(null);

onMounted(() => {
  if (serverEnabled.value) {
    try {
      socket.value = io(props.serverUrl);

      socket.value.on('connect', () => {
        console.log('Connected to server')
        if (socket.value) socket.value.emit(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_REQUEST)
      })

      socket.value.on(SOCKET_EVENTS.EXAMPLE_CLIENT_CALL_RESPONSE, (response: { data?: string }) => {
        console.log(`Message from server: ${response.data}`)
      })
    }
    catch (err) {
      console.error('WebSocket client error:', err)
    }
  }
})

onUnmounted(() => {
  if (serverEnabled.value && socket?.value) socket.value.disconnect()
})

const data = ref<Record<string, unknown> | null>(null);
const loading = ref<boolean>(false);
const toast = useToast();

// Show toast notification
const showToast = (severity: 'success' | 'warn' | 'error', summary: string, detail?: string, life = 3000) => {
  toast.add({
    severity,
    summary,
    detail,
    life,
    closable: true
  });
};

// Fetch mock data from server
async function fetchData(): Promise<void> {
  if (serverEnabled.value) {
    loading.value = true;
    try {
      const response = await fetch(`${props.serverUrl}/data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data.value = await response.json();
      showToast('success', 'Data Fetched', 'Mock data retrieved successfully');
    } catch (err) {
      console.log('[Template App] Error fetching data:', err);
    } finally {
      loading.value = false;
    }
  }
}

const landingStats = computed(() => ({
  dataLoaded: data.value ? 1 : 0,
  serverEnabled: serverEnabled.value ? 1 : 0,
}));
</script>
<template>
  <!--
    rm-67: Prefer Tailwind + lab-* tokens on elements; avoid scoped <style> for layout/chrome.
    Change root class to your app id (e.g. task-list-app).
  -->
  <div
    class="template-app app-loaded-container text-lab-general-text w-full min-w-0 min-h-full h-full flex flex-col overflow-hidden"
  >
    <header class="lab-app-header">
      <div>
        <h1 :id="generateUniqueId('title')" class="text-2xl font-semibold m-0 text-lab-general-text">Template App</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">Starter layout for new THE-LAB hybrid apps</p>
      </div>
      <Button
        v-if="serverEnabled"
        label="Get Mock Data"
        @click="fetchData"
        :disabled="loading"
        icon="pi pi-download"
        severity="success"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId('btn') } } }"
      />
    </header>

    <main class="lab-app-body">
      <div class="lab-app-landing w-full min-w-0">
        <div>
          <h2 class="text-lg font-semibold m-0 text-lab-general-text">Dashboard</h2>
          <p class="text-sm text-lab-general-text-muted m-0 mt-1">This is a template app shell — customize for your product.</p>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-md">
          <div class="lab-app-kpi">
            <span class="lab-app-kpi-label">Server</span>
            <span class="lab-app-kpi-value">{{ landingStats.serverEnabled ? 'On' : 'Off' }}</span>
          </div>
          <div class="lab-app-kpi">
            <span class="lab-app-kpi-label">Data loaded</span>
            <span class="lab-app-kpi-value">{{ landingStats.dataLoaded }}</span>
          </div>
        </div>

        <section class="lab-app-panel">
      <!-- Action Buttons -->
      <div v-if="serverEnabled" class="flex flex-wrap gap-3 mb-6">
        <Button label="Get Mock Data" @click="fetchData" :disabled="loading" icon="pi pi-download" severity="success"
          rounded :pt="{ root: { attrs: { id: generateUniqueId('btn-panel') } } }" />
      </div>

      <!-- Data Content -->
      <div v-if="data" class="mt-6">
        <Card class="mb-4 border border-lab-general-border bg-lab-general-bg">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi pi-database text-lg text-lab-button-border-hover" aria-hidden="true"></i>
                <span class="font-semibold text-lab-general-text">Response Data</span>
              </div>
              <Badge value="JSON" severity="primary"></Badge>
            </div>
          </template>
          <template #content>
            <pre
              class="m-0 rounded-lg border border-lab-general-border bg-lab-general-bg p-4 font-mono text-sm leading-relaxed text-lab-general-text overflow-x-auto whitespace-pre-wrap"
            >
              {{ JSON.stringify(data, null, 2) }}
            </pre>
          </template>
        </Card>
      </div>
        </section>
      </div>
    </main>
  </div>

</template>
