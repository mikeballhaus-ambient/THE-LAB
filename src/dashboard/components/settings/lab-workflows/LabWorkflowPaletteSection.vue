<script setup lang="ts">
import { ref } from 'vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  title: string;
  count?: number;
  /** When true, section starts expanded. */
  defaultOpen?: boolean;
}>();

const { generateUniqueId } = useUniqueElementId();
const expanded = ref(props.defaultOpen ?? false);

const toggleId = generateUniqueId(`wf-palette-section-${props.title}`);
</script>

<template>
  <div class="lab-workflow-palette-section">
    <button
      :id="toggleId"
      type="button"
      class="lab-workflow-palette-section__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <i
        class="pi text-xs"
        :class="expanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        aria-hidden="true"
      />
      <span class="lab-workflow-palette-section__title">{{ title }}</span>
      <span v-if="count != null" class="lab-workflow-palette-section__count">{{ count }}</span>
    </button>
    <div v-show="expanded" class="lab-workflow-palette-section__body">
      <slot />
    </div>
  </div>
</template>
