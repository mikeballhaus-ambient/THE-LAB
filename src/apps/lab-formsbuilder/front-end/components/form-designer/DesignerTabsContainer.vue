<script setup lang="ts">
import { computed, inject, ref, unref, watch } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { FormComponent } from '../../../shared/types';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import ContainerChildPlacedContent from './ContainerChildPlacedContent.vue';
import { getChildComponents } from '../../utils/container-types';
import { FORM_COMPONENTS_KEY } from '@/shared/forms/form-components-context';
import {
  FORM_DESIGN_CONTAINER_DROP_KEY,
  FORM_DESIGN_TABS_ACTIVE_TAB_KEY,
} from './design-container-context';

const props = defineProps<{
  component: FormComponent;
}>();

const { generateUniqueId } = useUniqueElementId();
const allComponents = computed(
  () =>
    (unref(inject(FORM_COMPONENTS_KEY, ref<IFormRuntimeField[]>([]))) ?? []) as FormComponent[],
);
const containerDropEnabled = inject(FORM_DESIGN_CONTAINER_DROP_KEY, null);
const tabsActiveTabByFieldKey = inject(FORM_DESIGN_TABS_ACTIVE_TAB_KEY, null);

const tabDefs = computed(
  () => props.component.container?.tabs ?? [{ title: 'Tab 1', childFieldKeys: [] }],
);

const activeTabValue = ref('0');

watch(
  () => props.component.fieldKey,
  () => {
    activeTabValue.value = '0';
  },
);

watch(
  [activeTabValue, () => props.component.fieldKey],
  () => {
    if (!tabsActiveTabByFieldKey) {
      return;
    }
    const parsed = Number.parseInt(activeTabValue.value, 10);
    const index = Number.isFinite(parsed) ? parsed : 0;
    tabsActiveTabByFieldKey.value.set(props.component.fieldKey, index);
  },
  { immediate: true },
);

const panels = computed(() =>
  tabDefs.value.map((tab, index) => {
    const keys = new Set(tab.childFieldKeys ?? []);
    const fromKeys = (allComponents.value ?? []).filter(c => keys.has(c.fieldKey));
    const fromParent = getChildComponents(props.component, allComponents.value).filter(c =>
      keys.size === 0 ? index === 0 : keys.has(c.fieldKey),
    );
    const children = keys.size > 0 ? fromKeys : fromParent;
    return { ...tab, children, index };
  }),
);
</script>

<template>
  <div class="tabs-container w-full h-full min-h-[5rem] rounded-lg border border-lab-general-border bg-lab-general-bg-muted p-2 box-border">
    <div v-if="component.label" class="text-sm font-semibold text-lab-general-text mb-2">{{ component.label }}</div>
    <Tabs
      v-model:value="activeTabValue"
      :pt="{ root: { id: generateUniqueId('designer-tabs-root'), class: 'w-full!' } }"
    >
      <TabList pt:root="flex!" pt:tabList="flex! flex-wrap! items-end! justify-start!">
        <Tab
          v-for="tab in panels"
          :key="`tab-head-${tab.index}`"
          :value="String(tab.index)"
          class="border-t-0! border-b-2! px-3! py-2! whitespace-nowrap!"
          :class="{
            'text-lab-general-text! bg-lab-general-bg! border-lab-button-border-hover!': activeTabValue === String(tab.index),
            'text-lab-general-text-muted! bg-lab-general-bg-muted! border-lab-general-border! hover:text-lab-general-text! hover:bg-lab-general-bg! hover:border-lab-button-border-hover!':
              activeTabValue !== String(tab.index),
          }"
          :pt="{ root: { id: generateUniqueId(`designer-tab-${tab.index}`) } }"
        >
          {{ tab.title }}
        </Tab>
      </TabList>
      <TabPanels pt:root="w-full!">
        <TabPanel
          v-for="tab in panels"
          :key="`tab-panel-${tab.index}`"
          :value="String(tab.index)"
          :lazy="false"
        >
          <div
            v-if="containerDropEnabled"
            class="container-drop-zone flex flex-col gap-2 min-h-[4rem] w-full rounded-md border border-dashed border-lab-general-border/80 bg-lab-general-bg-muted/50 p-2 mt-2 transition-colors box-border"
            :data-container-key="component.fieldKey"
            :data-tab-index="tab.index"
          >
            <ContainerChildPlacedContent
              v-for="child in tab.children"
              :key="child.fieldKey"
              :component="child"
              :all-components="allComponents"
            />
            <p
              v-if="tab.children.length === 0"
              class="text-lab-general-text-muted text-xs m-0 text-center py-2 pointer-events-none"
            >
              Drop components here
            </p>
          </div>
          <div v-else class="flex flex-col gap-2 py-2">
            <ContainerChildPlacedContent
              v-for="child in tab.children"
              :key="child.fieldKey"
              :component="child"
              :all-components="allComponents"
            />
            <p v-if="tab.children.length === 0" class="text-lab-general-text-muted text-xs m-0">
              Assign fields using Parent container or tab child keys.
            </p>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
