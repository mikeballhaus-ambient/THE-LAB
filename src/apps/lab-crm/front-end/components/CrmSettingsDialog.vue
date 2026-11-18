<script setup lang="ts">
import { nextTick, ref } from 'vue';
import Dialog from 'primevue/dialog';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import EntityAdmin from './EntityAdmin.vue';
import FormBindingsAdmin from './FormBindingsAdmin.vue';

const entityAdminRef = ref<InstanceType<typeof EntityAdmin> | null>(null);

defineProps<{
  serverUrl: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  changed: [];
}>();

const { generateUniqueId } = useUniqueElementId();
const activeTab = ref<'entities' | 'bindings'>('entities');

type SettingsTabId = 'entities' | 'bindings';

/** Match Forms Builder PropertyEditor tabs: bottom border accent on active tab. */
function settingsTabHeadClasses(tabId: SettingsTabId): Record<string, boolean> {
  const active = activeTab.value === tabId;
  return {
    'border-t-0! border-b-2! px-3! py-2! whitespace-nowrap! text-xs! rounded-t!': true,
    'border-[var(--lab-accent-primary)]! bg-[color-mix(in_srgb,var(--lab-accent-primary)_18%,var(--lab-general-bg))]! text-[var(--lab-general-text)]!':
      active,
    'border-[color-mix(in_srgb,var(--lab-general-border)_85%,transparent)]! bg-[color-mix(in_srgb,var(--lab-general-border)_30%,var(--lab-general-bg))]! text-[var(--lab-general-text-muted)]! hover:text-[var(--lab-general-text)]!':
      !active,
  };
}

function onAdminChanged(): void {
  emit('changed');
}

async function openNewEntity(): Promise<void> {
  activeTab.value = 'entities';
  await nextTick();
  if (!entityAdminRef.value) {
    await nextTick();
  }
  entityAdminRef.value?.openCreate();
}

defineExpose({ openNewEntity });
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    maximizable
    append-to="body"
    class="crm-settings-dialog lab-integration-dialog lab-app-dialog lab-form-runtime"
    :style="{ width: 'min(56rem, 96vw)' }"
    :pt="{
      root: { attrs: { id: generateUniqueId('crm-settings-dialog') } },
      mask: { class: 'lab-app-dialog' },
    }"
  >
    <template #header>
      <span class="font-semibold">CRM settings</span>
    </template>

    <div class="crm-settings-tabs-shell rounded-lg border border-lab-general-border bg-lab-general-bg-muted p-1">
      <Tabs
        v-model:value="activeTab"
        class="crm-settings-tabs flex flex-col"
        :pt="{ root: { id: generateUniqueId('crm-settings-tabs'), class: 'flex flex-col!' } }"
      >
        <TabList
          pt:root="shrink-0! w-full!"
          pt:tabList="flex! flex-wrap! items-end! justify-start! w-full! gap-0!"
        >
          <Tab
            value="entities"
            :class="settingsTabHeadClasses('entities')"
            :pt="{ root: { id: generateUniqueId('crm-settings-tab-entities') } }"
          >
            Entity models
          </Tab>
          <Tab
            value="bindings"
            :class="settingsTabHeadClasses('bindings')"
            :pt="{ root: { id: generateUniqueId('crm-settings-tab-bindings') } }"
          >
            Form bindings
          </Tab>
        </TabList>
        <TabPanels pt:root="mt-1!">
          <TabPanel value="entities">
            <EntityAdmin ref="entityAdminRef" :server-url="serverUrl" @changed="onAdminChanged" />
          </TabPanel>
          <TabPanel value="bindings">
            <FormBindingsAdmin :server-url="serverUrl" @changed="onAdminChanged" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </Dialog>
</template>

<style scoped>
.crm-settings-tabs-shell :deep([data-pc-section='tablist']) {
  border-bottom: 1px solid color-mix(in srgb, var(--lab-general-border) 75%, transparent);
}

:deep(.crm-entity-admin),
:deep(.crm-form-bindings-admin) {
  padding-top: 0.5rem;
}
</style>
