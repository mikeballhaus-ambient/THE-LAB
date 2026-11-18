<script setup lang="ts">
import { ref, shallowRef, computed, type Component } from 'vue';
import { APP_REGISTRY, findAppById } from './apps/AppRegistry';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

defineProps<{
  serverUrl?: string;
  formsBuilderUrl?: string;
}>();

const { generateUniqueId } = useUniqueElementId();

const activeAppId = ref<string | null>(null);
const components = shallowRef<Component | null>(null);

const landingStats = computed(() => ({
  exampleCount: APP_REGISTRY.length,
  activeExample: activeAppId.value ? 1 : 0,
}));

const activeAppMeta = computed(() => {
  if (!activeAppId.value) {
    return null;
  }
  return findAppById(activeAppId.value) ?? null;
});

async function activateApp(appId: string) {
  components.value = null;

  activeAppId.value = appId;

  try {
    const examplePath = `./apps/${appId}/Example.vue`;
    const ExampleComponent = await import(/* @vite-ignore */examplePath);

    if (typeof ExampleComponent.default === 'undefined') {
      throw new Error(`No default export found in ${examplePath}`);
    }

    components.value = ExampleComponent.default;
  } catch (error) {
    console.error('Failed to load app:', error);
    activeAppId.value = null;
  }
}

function deactivateApp() {
  components.value = null;
  activeAppId.value = null;
}
</script>

<template>
  <div
    class="drag-drop-examples-app app-loaded-container text-slate-300 w-full min-w-0 min-h-full h-full flex flex-col overflow-hidden"
    :id="generateUniqueId('dnd-examples-app-root')"
  >
    <header class="lab-app-header" :id="generateUniqueId('dnd-examples-app-header')">
      <div>
        <h1 :id="generateUniqueId('h1')" class="text-2xl font-semibold m-0">Drag and Drop Examples</h1>
        <p :id="generateUniqueId('p')" class="text-sm text-slate-400 m-0 mt-1">
          Interactive samples built with @vue-dnd-kit/core
        </p>
      </div>
      <Button
        v-if="activeAppId"
        label="Back to gallery"
        icon="pi pi-arrow-left"
        severity="secondary"
        size="small"
        outlined
        :pt="{ root: { attrs: { id: generateUniqueId('btn-back-gallery') } } }"
        @click="deactivateApp"
      />
    </header>

    <main class="lab-app-body" :id="generateUniqueId('dnd-examples-app-body')">
      <!-- Gallery View -->
      <div v-if="!activeAppId" class="lab-app-landing w-full">
        <div>
          <h2 :id="generateUniqueId('dashboard-heading')" class="text-lg font-semibold m-0">Dashboard</h2>
          <p class="text-sm text-slate-400 m-0 mt-1">
            Pick an example to explore patterns for lists, grids, games, and constrained drag targets.
          </p>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-examples')">
            <span class="lab-app-kpi-label">Examples</span>
            <span class="lab-app-kpi-value">{{ landingStats.exampleCount }}</span>
          </div>
          <div class="lab-app-kpi" :id="generateUniqueId('kpi-active')">
            <span class="lab-app-kpi-label">Running</span>
            <span class="lab-app-kpi-value">{{ landingStats.activeExample }}</span>
          </div>
        </div>

        <section class="lab-app-panel" :id="generateUniqueId('dnd-landing-panel')">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <button
              v-for="app in APP_REGISTRY"
              :key="app.id"
              type="button"
              class="dnd-example-card text-left rounded-lg border border-slate-600/80 bg-slate-800/40 p-4 hover:border-cyan-500/50 hover:bg-slate-800/70 transition-colors cursor-pointer group"
              :id="generateUniqueId(`dnd-example-card-${app.id}`)"
              @click="activateApp(app.id)"
            >
              <h3
                class="text-base font-semibold text-slate-100 mb-2 group-hover:text-cyan-200 m-0"
                :id="generateUniqueId(`dnd-card-title-${app.id}`)"
              >{{ app.name }}</h3>
              <p class="text-slate-400 text-sm m-0 leading-snug">{{ app.description }}</p>
            </button>
          </div>
        </section>
      </div>

      <!-- Active App View -->
      <div v-else class="lab-app-landing w-full">
        <div v-if="activeAppMeta">
          <h2 class="text-lg font-semibold m-0" :id="generateUniqueId('dnd-active-title')">{{ activeAppMeta.name }}</h2>
          <p class="text-sm text-slate-400 m-0 mt-1">{{ activeAppMeta.description }}</p>
        </div>

        <section
          class="lab-app-panel flex flex-col gap-4 lg:flex-row lg:items-start"
          :id="generateUniqueId('dnd-active-panel')"
        >
          <div v-if="components" class="flex-1 min-w-0 overflow-auto">
            <component :is="components" />
          </div>

          <div class="flex justify-end shrink-0">
            <Button
              :pt="{ root: { attrs: { id: generateUniqueId('btn-close') } } }"
              label="Close"
              severity="secondary"
              outlined
              @click="deactivateApp"
            />
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
