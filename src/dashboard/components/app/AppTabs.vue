<script setup lang="ts">
/** @deprecated Use AppViewLayout.vue — legacy tab-only layout. */

import Tabs from 'primevue/tabs'

import TabList from 'primevue/tablist'

import Tab from 'primevue/tab'

import TabPanel from 'primevue/tabpanel'

import TabPanels from 'primevue/tabpanels'

import ToggleSwitch from 'primevue/toggleswitch'

import { RuntimeApp } from '@/shared/types';

import { computed, ref, watch } from 'vue'

import { useShowDependencyApps } from '@/shared/composables/components/useShowDependencyApps';

import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';



const props = withDefaults(defineProps<{

  tabOrderApps: RuntimeApp[],

  activeTabId: string | null,

  tabLoadingStates: Record<string, boolean>,

  handleCloseTab: (appId: string) => Promise<void>,

  updateActiveAppTab: (appId: string) => void,

  setShowDependencyApps: (showDependencyApps: boolean) => Promise<void>,

  getShowDependencyApps: () => Promise<boolean>,

}>(), {})



const { generateUniqueId } = useUniqueElementId();

const dependencyToggleId = generateUniqueId('dependency-apps-toggle');



const { showDependencyApps, updateShowDependencyApps } = useShowDependencyApps(

  (value) => props.setShowDependencyApps(value),

  () => props.getShowDependencyApps(),

);



const activeTabIdRef = ref<string | null>()



watch(() => props.activeTabId, newVal => {

  activeTabIdRef.value = newVal

}, { immediate: true })



function onTabValueChange(value: string | number | undefined): void {

  if (typeof value === 'string') {

    activeTabIdRef.value = value

    props.updateActiveAppTab(value)

  }

}



const launchableTypes = new Set(['browser', 'hybrid', 'server']);



const allLaunchableApps = computed(() => {

  return props.tabOrderApps.filter((_) => launchableTypes.has(_.type));

});



const visibleTabApps = computed(() => {

  if (showDependencyApps.value) {

    return allLaunchableApps.value;

  }

  return allLaunchableApps.value.filter((app) => !app.isDependencyLaunch);

});



const hasDependencyTabs = computed(() =>

  allLaunchableApps.value.some((app) => app.isDependencyLaunch === true),

);



watch(

  [visibleTabApps, activeTabIdRef],

  () => {

    const current = activeTabIdRef.value;

    if (!current) {

      return;

    }

    if (visibleTabApps.value.some((app) => app.id === current)) {

      return;

    }

    const first = visibleTabApps.value[0];

    if (first) {

      onTabValueChange(first.id);

    }

  },

  { deep: true },

);



</script>



<template>

  <!-- PrimeVue Tabs -->

  <Tabs

    v-if="activeTabIdRef && allLaunchableApps.length > 0"

    v-model:value="activeTabIdRef"

    :pt="{ root: allLaunchableApps.length > 0 ? 'flex flex-col h-full' : 'hidden' }"

    @update:value="onTabValueChange"

  >

    <TabList pt:tabList="lab-workspace-tabbar">

      <Tab

        v-for="app in visibleTabApps"

        :key="app.id"

        :value="app.id"

        class="tab-item lab-workspace-tab"

        @click="props.updateActiveAppTab(app.id)"

        :class="
          activeTabIdRef === app.id ? 'lab-workspace-tab--active' : 'lab-workspace-tab--inactive'
        "

        :title="app.name"

      >

        <i :class="app.faIcon ? app.faIcon + ' mr-2' : ''" class="fa-solid text-sm flex-shrink-0"></i>

        <span class="truncate text-sm font-semibold">{{ app.name }}</span>

        <i

          v-if="props.tabLoadingStates[app.id]"

          class="ml-2 fa fa-spinner fa-spin lab-workspace-tab-spinner"

          title="Loading..."

        ></i>

        <i

          v-if="app.hasCloseButton"

          @click.stop="props.handleCloseTab(app.id)"

          class="ml-2 fa fa-times text-red-400 hover:text-red-300 cursor-pointer flex-shrink-0"

          title="Close this app"

        ></i>

      </Tab>

      <div

        v-if="hasDependencyTabs"

        class="ml-auto flex items-center gap-2 px-3 py-1 shrink-0 lab-workspace-toolbar-divider"

      >

        <ToggleSwitch

          :input-id="dependencyToggleId"

          :model-value="showDependencyApps"

          @update:model-value="updateShowDependencyApps"

        />

        <label :for="dependencyToggleId" class="text-xs! lab-workspace-dependency-label whitespace-nowrap cursor-pointer">

          Show Dependency Apps

        </label>

      </div>

    </TabList>



    <TabPanels pt:root="flex-1 overflow-hidden">

      <TabPanel

        v-for="app in allLaunchableApps"

        :key="app.id"

        :value="app.id"

        header=""

        :lazy="false"

        class="tab-panel-content h-full relative"

      >

        <div :id="`tab-container-${app.id}`" class="tab-app-container w-full h-full"></div>

      </TabPanel>

    </TabPanels>

  </Tabs>

</template>

