<script setup lang="ts">
import { computed, inject, ref, unref } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormField from '@/shared/forms/FormField.vue';
import { FORM_COMPONENTS_KEY } from '@/shared/forms/form-components-context';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const { generateUniqueId } = useUniqueElementId();

type RuntimeField = IFormRuntimeField & {
  parentContainerKey?: string;
  container?: { tabs?: Array<{ title: string; childFieldKeys?: string[] }> };
};

const allFields = computed(
  () => unref(inject(FORM_COMPONENTS_KEY, ref<IFormRuntimeField[]>([]))) ?? [],
);

const tabDefs = computed(() => {
  const container = (props.field as RuntimeField).container;
  return container?.tabs ?? [{ title: 'Tab 1', childFieldKeys: [] }];
});

const activeTab = ref('0');

const panels = computed(() =>
  tabDefs.value.map((tab, index) => {
    const keys = new Set(tab.childFieldKeys ?? []);
    const parentKey = props.field.fieldKey;
    const fromParent = allFields.value.filter(
      f =>
        (f as RuntimeField).parentContainerKey === parentKey
        && f.fieldKey !== parentKey
        && f.type !== 'Group'
        && f.type !== 'Tabs',
    );
    const fromKeys = allFields.value.filter(f => keys.has(f.fieldKey));
    const children = keys.size > 0 ? fromKeys : index === 0 ? fromParent : [];
    return { ...tab, children, index };
  }),
);
</script>

<template>
  <div class="w-full min-w-0">
    <div v-if="field.label" class="lab-form-group-title mb-2">{{ field.label }}</div>
    <Tabs
      v-model:value="activeTab"
      class="lab-form-tabs w-full"
      :pt="{ root: { id: generateUniqueId('runtime-tabs-root'), class: 'w-full!' } }"
    >
      <TabList pt:root="flex!" pt:tabList="flex! flex-wrap! items-end! justify-start!">
        <Tab
          v-for="tab in panels"
          :key="`runtime-tab-head-${tab.index}`"
          :value="String(tab.index)"
          :pt="{ root: { id: generateUniqueId(`runtime-tab-${tab.index}`) } }"
        >
          {{ tab.title }}
        </Tab>
      </TabList>
      <TabPanels pt:root="w-full!">
        <TabPanel
          v-for="tab in panels"
          :key="`runtime-tab-panel-${tab.index}`"
          :value="String(tab.index)"
        >
          <div class="flex flex-col gap-3 py-2">
            <FormField
              v-for="child in tab.children"
              :key="child.fieldKey"
              :field="child"
            />
            <p v-if="tab.children.length === 0" class="text-xs text-lab-general-text-muted m-0">
              No fields in this tab.
            </p>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
