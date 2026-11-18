<script setup lang="ts">
import { ref } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import LabLedgerJournal from '@/dashboard/components/settings/LabLedgerJournal.vue';
import LabLedgerAccountsAdmin from '@/dashboard/components/settings/LabLedgerAccountsAdmin.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
defineProps<{
  serverUrl?: string;
}>();

const { generateUniqueId } = useUniqueElementId();
const activeTab = ref<'journal' | 'accounts'>('journal');

function tabClasses(tab: 'journal' | 'accounts'): string {
  const base = 'text-sm! px-3! py-2!';
  return activeTab.value === tab
    ? `${base} font-semibold! text-lab-general-text!`
    : `${base} text-lab-general-text-muted!`;
}
</script>

<template>
  <div
    class="lab-financial-ledger-app lab-platform-catalog-app flex min-h-0 h-full flex-col overflow-hidden bg-lab-general-bg text-lab-general-text"
  >
    <Tabs
      v-model:value="activeTab"
      class="lab-platform-catalog-tabs flex min-h-0 flex-1 flex-col px-4 pt-3"
      :pt="{ root: { attrs: { id: generateUniqueId('lab-ledger-tabs') } } }"
    >
      <TabList pt:root="shrink-0! w-full!" pt:tabList="flex! gap-0! w-full!">
        <Tab value="journal" :class="tabClasses('journal')">Journal</Tab>
        <Tab value="accounts" :class="tabClasses('accounts')">Accounts</Tab>
      </TabList>
      <TabPanels pt:root="lab-platform-catalog-tabpanels flex min-h-0 flex-1 flex-col">
        <TabPanel value="journal" class="min-h-0 flex-1 overflow-auto p-4">
          <LabLedgerJournal v-if="activeTab === 'journal'" />
        </TabPanel>
        <TabPanel value="accounts" class="min-h-0 flex-1 overflow-auto p-4">
          <LabLedgerAccountsAdmin v-if="activeTab === 'accounts'" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
