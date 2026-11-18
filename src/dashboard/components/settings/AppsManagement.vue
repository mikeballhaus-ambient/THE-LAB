<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { DnDProvider } from '@vue-dnd-kit/core';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { putPlatformAppsOrder } from '@/shared/services/platform-apps-order.client';
import { fetchPlatformAppsCatalogAdmin } from '@/shared/services/platform-apps-catalog-admin.client';
import type { IApp } from '@/shared/types/app/app.d';
import type { RuntimeApp } from '@/shared/types';
import AppOrderDnDList from './AppOrderDnDList.vue';

const props = defineProps<{
  apps: RuntimeApp[];
}>();

const emit = defineEmits<{
  appsReordered: [apps: RuntimeApp[]];
}>();

const { generateUniqueId } = useUniqueElementId();
const toast = useToast();

const reorderedApps = ref<RuntimeApp[]>([]);
const saving = ref(false);
const dirty = ref(false);
const loading = ref(false);

function sortByOrder(apps: RuntimeApp[]): RuntimeApp[] {
  return [...apps].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function iAppToRuntime(app: IApp): RuntimeApp {
  return {
    ...app,
    instance: undefined,
    reload: () => {},
    emitReload: () => {},
    isServerSideEnabled: app.isServerSideEnabled ?? app.type === 'hybrid',
    latestVersion: app.latestVersion,
    isUpdateAvailable: app.isUpdateAvailable ?? false,
  };
}

async function loadCatalogAdmin(): Promise<void> {
  loading.value = true;
  try {
    const apps = await fetchPlatformAppsCatalogAdmin();
    reorderedApps.value = sortByOrder(apps.map(iAppToRuntime));
    dirty.value = false;
  } catch (err) {
    reorderedApps.value = sortByOrder(props.apps);
    dirty.value = false;
    toast.add({
      severity: 'warn',
      summary: 'Could not load full app catalog',
      detail: err instanceof Error ? err.message : 'Showing enabled apps only',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadCatalogAdmin();
});

watch(
  () => props.apps,
  (next) => {
    if (!dirty.value && !loading.value && reorderedApps.value.length === 0) {
      reorderedApps.value = sortByOrder(next);
    }
  },
  { immediate: true },
);

function onReorder(next: RuntimeApp[]): void {
  reorderedApps.value = next;
  dirty.value = true;
}

function onToggleEnabled(appId: string, enabled: boolean): void {
  const row = reorderedApps.value.find((app) => app.id === appId);
  if (!row) {
    return;
  }
  row.isEnabled = enabled;
  dirty.value = true;
}

function resetOrder(): void {
  void loadCatalogAdmin();
}

async function handleSave(): Promise<void> {
  if (saving.value || reorderedApps.value.length === 0) {
    return;
  }
  saving.value = true;
  try {
    const appIds = reorderedApps.value.map((app) => app.id);
    const enabledByAppId: Record<string, boolean> = {};
    for (const app of reorderedApps.value) {
      enabledByAppId[app.id] = app.isEnabled !== false;
    }
    const updated = await putPlatformAppsOrder(appIds, enabledByAppId);
    const sorted = sortByOrder(updated.map(iAppToRuntime));
    reorderedApps.value = sorted;
    dirty.value = false;
    emit(
      'appsReordered',
      sorted.filter((app) => app.isEnabled) as RuntimeApp[],
    );
    toast.add({
      severity: 'success',
      summary: 'App catalog saved',
      detail: 'Launch order and visibility were updated.',
      life: 4000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Could not save app catalog',
      life: 6000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="apps-management-panel p-4 lab-theme-app">
    <p class="text-sm text-lab-general-text-muted mb-4 m-0">
      Drag rows to set launch order. Use <strong>Visible</strong> to show or hide apps in the
      dashboard catalog (disabled apps stay registered — use this instead of deleting). System apps
      cannot be hidden.
    </p>

    <DnDProvider>
      <AppOrderDnDList
        :apps="reorderedApps"
        :disabled="saving || loading"
        @reorder="onReorder"
        @toggle-enabled="onToggleEnabled"
      />
    </DnDProvider>

    <div class="flex flex-wrap justify-end gap-2 mt-4">
      <Button
        type="button"
        label="Reset"
        severity="secondary"
        :disabled="saving || loading || !dirty"
        :pt="{ root: { attrs: { id: generateUniqueId('reset-app-order-btn') } } }"
        @click="resetOrder"
      />
      <Button
        type="button"
        label="Save catalog"
        severity="primary"
        :loading="saving"
        :disabled="!dirty || saving || loading"
        :pt="{ root: { attrs: { id: generateUniqueId('save-app-order-btn') } } }"
        @click="handleSave"
      />
    </div>
  </div>
</template>