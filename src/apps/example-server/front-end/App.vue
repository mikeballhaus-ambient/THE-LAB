<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { io } from 'socket.io-client';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Badge from 'primevue/badge';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';

const { generateUniqueId } = useUniqueElementId();

interface Props {
  serverUrl?: string;
  formsBuilderUrl?: string;
}

const props = defineProps<Props>();
const socket = ref<ReturnType<typeof io> | null>(null);

const emit = defineEmits<{
  (e: 'data-fetched', data: unknown): void;
  (e: 'health-checked', health: unknown): void;
}>();

onMounted(() => {
  try {
    socket.value = io(props.serverUrl);

    socket.value.on('connect', () => {
      console.log('Connected to server')
      if (socket.value) socket.value.emit('example-client-call-request')
    })

    socket.value.on('example-client-call-response', (response: { data?: string }) => {
      console.log(`Message from server: ${response.data}`)
    })
  }
  catch (err) {
    console.error('WebSocket client error:', err)
  }
})

onUnmounted(() => {
  if (socket.value) socket.value.disconnect()
})

const data = ref<unknown>(null);
const health = ref<Record<string, unknown> | null>(null);
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
  loading.value = true;

  try {
    const response = await labAppFetch(`${props.serverUrl}/data`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    data.value = await response.json();
    console.log('[ExampleServerApp] Data fetched successfully');
    showToast('success', 'Data Fetched', 'Mock data retrieved successfully');
    emit('data-fetched', data.value);
  } catch (err) {
    console.log('[ExampleServerApp] Error fetching data:', err);
  } finally {
    loading.value = false;
  }
}

// Reset data on server
async function resetData(): Promise<void> {
  loading.value = true;

  try {
    const response = await labAppFetch(`${props.serverUrl}/data/update`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    data.value = await response.json();
    console.log('[ExampleServerApp] Data reset successfully');
    showToast('success', 'Data Reset', 'Server data has been reset');
    emit('data-fetched', data.value);
  } catch (err) {
    console.log('[ExampleServerApp] Error resetting data:', err);
  } finally {
    loading.value = false;
  }
}

// Check server health
async function checkHealth(): Promise<void> {
  loading.value = true;

  try {
    const response = await labAppFetch(`${props.serverUrl}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    health.value = await response.json();
    console.log('[ExampleServerApp] Health check completed');
    showToast('success', 'Health Check Passed', 'Server is running normally');
    emit('health-checked', health.value);
  } catch (err) {
    console.log('[ExampleServerApp] Health check failed:', err);
    const errorSummary = health.value?.status === 'error' ? 'Health Check Failed' : 'Check Failed';
    showToast('error', errorSummary, err instanceof Error ? err.message : 'Health check failed');
  } finally {
    loading.value = false;
  }
}

// Clear response data
function clearResponse(): void {
  data.value = null;
  health.value = null;
  console.log('[ExampleServerApp] Response cleared');
  showToast('warn', 'Cleared', 'Response data has been cleared');
}

const serverBaseUrl = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL}:${import.meta.env.VITE_API_BASE_PORT}`
})

const displayServerUrl = computed(() => props.serverUrl || serverBaseUrl.value)

const landingStats = computed(() => ({
  dataLoaded: data.value ? 1 : 0,
  healthChecked: health.value ? 1 : 0,
  endpoints: 3,
  socketConnected: socket.value?.connected ? 1 : 0,
}))
</script>
<template>
  <div
    class="example-server-app lab-app-workspace-fill app-loaded-container text-lab-general-text-muted w-full min-w-0 min-h-full h-full flex flex-col overflow-hidden"
    :id="generateUniqueId('example-server-app-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('example-server-app-header')">
      <div>
        <h1 :id="generateUniqueId('h1-title')" class="text-2xl font-semibold m-0">Example Server App</h1>
        <p class="text-sm text-lab-general-text-muted m-0 mt-1">Fastify-based server testing and demonstration</p>
      </div>
      <div class="flex max-sm:flex-col flex-wrap gap-2 shrink-0">
        <Button
          label="Get Mock Data"
          @click="fetchData"
          :disabled="loading"
          icon="pi pi-download"
          severity="success"
          size="small"
          :pt="{ root: { attrs: { id: generateUniqueId('btn-fetch-header') } } }"
        />
        <Button
          label="Check Health"
          @click="checkHealth"
          :disabled="loading"
          icon="pi pi-check-circle"
          severity="info"
          size="small"
          outlined
          :pt="{ root: { attrs: { id: generateUniqueId('btn-health-header') } } }"
        />
      </div>
    </header>

    <main class="lab-app-body" :id="generateUniqueId('example-server-app-body')">
      <div class="lab-app-landing w-full min-w-0">
        <div>
          <h2 :id="generateUniqueId('dashboard-heading')" class="text-lg font-semibold m-0">Dashboard</h2>
          <p class="text-sm text-lab-general-text-muted m-0 mt-1 leading-relaxed">
            Fetch mock data, reset the server dataset, and run health checks against your app server.
          </p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-endpoints')">
            <span class="lab-app-kpi-label">API actions</span>
            <span class="lab-app-kpi-value">{{ landingStats.endpoints }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-data')">
            <span class="lab-app-kpi-label">Data loaded</span>
            <span class="lab-app-kpi-value">{{ landingStats.dataLoaded }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-health')">
            <span class="lab-app-kpi-label">Health checked</span>
            <span class="lab-app-kpi-value">{{ landingStats.healthChecked }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-socket')">
            <span class="lab-app-kpi-label">Socket</span>
            <span class="lab-app-kpi-value text-emerald-400">{{ landingStats.socketConnected ? 'Live' : '—' }}</span>
          </div>
        </div>

        <section class="lab-app-panel" :id="generateUniqueId('landing-panel')">
      <!-- Action Buttons -->
      <div class="mb-6 flex max-sm:flex-col flex-wrap gap-3">
        <Button label="Get Mock Data" @click="fetchData" :disabled="loading" icon="pi pi-download" severity="success"
          rounded :pt="{ root: { attrs: { id: generateUniqueId('btn-fetch') } }}" />

        <Button label="Reset Data" @click="resetData" :disabled="loading" icon="pi pi-refresh" severity="warning"
          rounded :pt="{ root: { attrs: { id: generateUniqueId('btn-reset') } }}" />

        <Button label="Check Health" @click="checkHealth" :disabled="loading" icon="pi pi-check-circle" severity="info"
          rounded :pt="{ root: { attrs: { id: generateUniqueId('btn-health') } }}" />

        <Button label="Clear Response" @click="clearResponse" :disabled="loading" icon="pi pi-times" severity="contrast"
          text :pt="{ root: { attrs: { id: generateUniqueId('btn-clear') } }}" />
      </div>
      <!-- Health Content -->
      <div v-if="health" class="mt-6">
        <Card :pt="{ root: { attrs: { id: generateUniqueId('card-health') } }}" class="bg-gray-50 dark:bg-gray-800 mb-4" header="Health Check">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi fa-heartbeat text-green-500 text-lg"></i>
                <span class="font-semibold text-gray-700 dark:text-gray-200">Health Check</span>
              </div>
              <Badge :pt="{ root: { attrs: { id: generateUniqueId('badge-health') } }}" value="Status: OK" severity="success"></Badge>
            </div>
          </template>
          <template #content>
            <ul :id="generateUniqueId('health-list')" class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li class="flex items-center gap-2">
                <i class="pi pi-check-circle text-green-500"></i>
                Server Status: <span class="font-medium text-green-600 dark:text-green-400">Running</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="pi fa-clock"></i>
                Uptime: <span class="font-medium">{{ health.uptime || 'N/A' }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="pi fa-network-wired"></i>
                Connections: <span class="font-medium">{{ health.connections || 'N/A' }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="pi fa-tachometer-alt"></i>
                Requests/min: <span class="font-medium">{{ health.requestsPerMinute || 'N/A' }}</span>
              </li>
            </ul>
          </template>
        </Card>
      </div>
      <!-- Data Content -->
      <div v-if="data" class="mt-6">
        <Card :pt="{ root: { attrs: { id: generateUniqueId('card-data') } }}" class="bg-gray-50 dark:bg-gray-800 mb-4" header="Response Data">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i class="pi pi-database text-blue-500 text-lg"></i>
                <span class="font-semibold text-gray-700 dark:text-gray-200">Response Data</span>
              </div>
              <Badge :pt="{ root: { attrs: { id: generateUniqueId('badge-data') } }}" value="JSON" severity="primary"></Badge>
            </div>
          </template>
          <template #content>
            <pre
              :id="generateUniqueId('pre-data')"
              class="m-0 overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-green-400">
              {{ JSON.stringify(data, null, 2) }}
            </pre>
          </template>
        </Card>
      </div>
      <div
        class="flex items-center justify-between text-sm text-lab-general-text-muted border-t border-lab-general-border/60 pt-4 mt-4">
        <div class="flex items-center gap-4">
          <span><i class="pi pi-info-circle mr-1"></i>Server: {{ displayServerUrl }}</span>
        </div>
      </div>
        </section>
      </div>
    </main>
  </div>

</template>
