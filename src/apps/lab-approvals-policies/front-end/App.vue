<script setup lang="ts">
import { ref, watch } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import LabApprovalsInbox from '@/dashboard/components/settings/LabApprovalsInbox.vue';
import LabApprovalPoliciesManagement from '@/dashboard/components/settings/LabApprovalPoliciesManagement.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
defineProps<{
  serverUrl?: string;
}>();

const { generateUniqueId } = useUniqueElementId();
const activeTab = ref<'inbox' | 'policies'>('inbox');
const inboxNotificationFocus = ref(false);

watch(inboxNotificationFocus, (focused) => {
  if (focused) {
    activeTab.value = 'inbox';
  }
});

function tabClasses(tab: 'inbox' | 'policies'): string {
  const base = 'text-sm! px-3! py-2!';
  return activeTab.value === tab
    ? `${base} font-semibold! text-lab-general-text!`
    : `${base} text-lab-general-text-muted!`;
}
</script>

<template>
  <div
    class="lab-approvals-policies-app lab-platform-catalog-app flex min-h-0 h-full flex-col overflow-hidden bg-lab-general-bg text-lab-general-text"
  >
    <Tabs
      v-model:value="activeTab"
      class="lab-platform-catalog-tabs flex min-h-0 flex-1 flex-col px-4 pt-3"
      :pt="{ root: { attrs: { id: generateUniqueId('lab-approvals-tabs') } } }"
    >
      <TabList pt:root="shrink-0! w-full!" pt:tabList="flex! gap-0! w-full!">
        <Tab value="inbox" :class="tabClasses('inbox')">Approvals inbox</Tab>
        <Tab v-if="!inboxNotificationFocus" value="policies" :class="tabClasses('policies')">
          Policies (admin)
        </Tab>
      </TabList>
      <TabPanels pt:root="lab-platform-catalog-tabpanels flex min-h-0 flex-1 flex-col">
        <TabPanel value="inbox" class="min-h-0 flex-1 overflow-auto p-4">
          <LabApprovalsInbox @focus-mode-change="inboxNotificationFocus = $event" />
        </TabPanel>
        <TabPanel
          v-if="!inboxNotificationFocus"
          value="policies"
          class="min-h-0 flex-1 overflow-auto p-4"
        >
          <LabApprovalPoliciesManagement />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
