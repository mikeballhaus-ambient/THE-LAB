<script setup lang="ts">
import { ref } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = withDefaults(
  defineProps<{
    appId: string;
    appName: string;
    count?: number;
    defaultOpen?: boolean;
  }>(),
  { defaultOpen: false },
);

const { generateUniqueId } = useUniqueElementId();
const expanded = ref(props.defaultOpen);

const toggleId = generateUniqueId(`wf-palette-app-${props.appId}`);
</script>

<template>
  <div class="lab-workflow-palette-app-group">
    <button
      :id="toggleId"
      type="button"
      class="lab-workflow-palette-app-group__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <i
        class="pi shrink-0 text-[0.65rem]"
        :class="expanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        aria-hidden="true"
      />
      <span class="lab-workflow-palette-app-group__name truncate">{{ appName }}</span>
      <span v-if="count != null" class="lab-workflow-palette-app-group__count">{{ count }}</span>
    </button>
    <div v-show="expanded" class="lab-workflow-palette-app-group__body">
      <slot />
    </div>
  </div>
</template>
