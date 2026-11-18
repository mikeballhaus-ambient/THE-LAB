<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Badge from 'primevue/badge';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const { generateUniqueId } = useUniqueElementId();

interface Props {
  serverUrl?: string;
  appName?: string;
  appId?: string;
}

const props = defineProps<Props>();

type HealthState = 'unknown' | 'healthy' | 'unhealthy' | 'checking';

const healthState = ref<HealthState>('unknown');
const healthBody = ref<unknown>(null);
const healthError = ref<string | null>(null);
const lastCheckedAt = ref<Date | null>(null);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const statusLabel = computed(() => {
  switch (healthState.value) {
    case 'healthy':
      return 'Healthy';
    case 'unhealthy':
      return 'Unreachable';
    case 'checking':
      return 'Checking…';
    default:
      return 'Unknown';
  }
});

const statusSeverity = computed(() => {
  switch (healthState.value) {
    case 'healthy':
      return 'success';
    case 'unhealthy':
      return 'danger';
    case 'checking':
      return 'warn';
    default:
      return 'secondary';
  }
});

const formattedHealth = computed(() => {
  if (healthBody.value == null) {
    return healthError.value ?? 'No response yet';
  }
  try {
    return JSON.stringify(healthBody.value, null, 2);
  } catch {
    return String(healthBody.value);
  }
});

async function checkHealth(): Promise<void> {
  if (!props.serverUrl) {
    healthState.value = 'unhealthy';
    healthError.value = 'No server URL configured';
    healthBody.value = null;
    return;
  }

  healthState.value = 'checking';
  healthError.value = null;

  try {
    const response = await fetch(`${props.serverUrl}/health`);
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    lastCheckedAt.value = new Date();

    if (response.ok) {
      healthState.value = 'healthy';
      healthBody.value = parsed;
      stopPolling();
    } else {
      healthState.value = 'unhealthy';
      healthBody.value = parsed;
      healthError.value = `HTTP ${response.status}`;
    }
  } catch (err: unknown) {
    healthState.value = 'unhealthy';
    healthBody.value = null;
    healthError.value = err instanceof Error ? err.message : 'Health check failed';
    lastCheckedAt.value = new Date();
  }
}

function startPolling(): void {
  stopPolling();
  void checkHealth();
  pollTimer = setInterval(() => {
    void checkHealth();
  }, 10000);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
}

watch(
  () => props.serverUrl,
  () => {
    startPolling();
  }
);

onMounted(() => {
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="h-[calc(100vh-164px)]! overflow-y-auto!"
    :class="[
      props.appId ? `${props.appId}-app` : 'server-app-status',
      'server-app-status w-full p-4 text-lab-general-text',
    ]"
  >
    <Card pt:root="bg-lab-general-bg-muted! border! border-lab-general-border!">
      <template #title>
        <div class="flex items-center gap-3">
          <i class="fa-solid fa-server text-cyan-400"></i>
          <span>{{ props.appName ?? 'Server app' }}</span>
          <Badge :value="statusLabel" :severity="statusSeverity" />
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-3 text-sm">
          <div class="flex flex-wrap gap-4 text-lab-general-text-muted text-xs">
            <span v-if="props.serverUrl">Endpoint: {{ props.serverUrl }}</span>
            <span v-if="lastCheckedAt">Last check: {{ lastCheckedAt.toLocaleTimeString() }}</span>
          </div>
          <pre
            class="bg-lab-general-bg-muted! border border-lab-general-border! rounded-lg p-3 text-xs overflow-auto max-h-[320px] text-lab-general-text-muted"
          >{{ formattedHealth }}</pre>
          <div>
            <Button
              label="Refresh health"
              icon="pi pi-refresh"
              size="small"
              severity="secondary"
              :loading="healthState === 'checking'"
              :pt="{ root: { attrs: { id: generateUniqueId('server-app-refresh-health') } } }"
              @click="checkHealth"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
