<script setup lang="ts">
import { ref } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import MyWorkflowsManagement from '@/dashboard/components/settings/MyWorkflowsManagement.vue';
import LabWorkflowsManagement from '@/dashboard/components/settings/LabWorkflowsManagement.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import '@/assets/styles/platform-catalog-app.css';
defineProps<{
  serverUrl?: string;
}>();

const { generateUniqueId } = useUniqueElementId();
const activeTab = ref<'mine' | 'admin'>('mine');

function tabClasses(tab: 'mine' | 'admin'): string {
  const base = 'text-sm! px-3! py-2!';
  return activeTab.value === tab
    ? `${base} font-semibold! text-lab-general-text!`
    : `${base} text-lab-general-text-muted!`;
}
</script>

<template>
  <div
    class="lab-workflow-studio-app lab-platform-catalog-app flex min-h-0 h-full flex-col overflow-hidden bg-lab-general-bg text-lab-general-text"
  >
    <Tabs
      v-model:value="activeTab"
      class="lab-platform-catalog-tabs flex min-h-0 flex-1 flex-col px-4 pt-3"
      :pt="{ root: { attrs: { id: generateUniqueId('lab-workflows-tabs') } } }"
    >
      <TabList pt:root="shrink-0! w-full!" pt:tabList="flex! gap-0! w-full!">
        <Tab value="mine" :class="tabClasses('mine')">My workflows</Tab>
        <Tab value="admin" :class="tabClasses('admin')">Lab workflows (admin)</Tab>
      </TabList>
      <!--
        `overflow-auto p-4` is the configuration that renders reliably: the panel sizes to content
        and scrolls itself, independent of PrimeVue's internals. The editor inside takes an explicit
        viewport height rather than trying to inherit one through this chain.
      -->
      <TabPanels pt:root="lab-platform-catalog-tabpanels">
        <TabPanel value="mine" class="min-h-0 flex-1 overflow-auto">
          <MyWorkflowsManagement />
        </TabPanel>
        <TabPanel value="admin" class="min-h-0 flex-1 overflow-auto">
          <LabWorkflowsManagement :admin-mode="true" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
