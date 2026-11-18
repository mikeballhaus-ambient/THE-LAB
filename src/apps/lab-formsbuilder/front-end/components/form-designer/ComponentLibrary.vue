<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Card from 'primevue/card';
import DraggableItem from './DraggableItem.vue';
import type { FormComponent } from '../../../shared/types';
import { useFormComponents } from '../../composables/useFormComponents';
import { isContainerType } from '../../utils/container-types';

defineEmits<{
  (e: 'drag-start', component: FormComponent): void;
  (e: 'drag-end'): void;
}>();

const { getAvailableComponentTypes, preloadComponents, getComponentMetadata } = useFormComponents();

const fieldComponents = ref<FormComponent[]>([]);
const containerComponents = ref<FormComponent[]>([
  { type: 'Group', label: 'Group', fieldKey: '', icon: 'pi pi-window-maximize' },
  { type: 'Tabs', label: 'Tabs', fieldKey: '', icon: 'pi pi-table' },
]);

onMounted(async () => {
  await preloadComponents();
  const types = getAvailableComponentTypes().filter(t => !isContainerType(t));
  fieldComponents.value = types.map(type => getComponentMetadata(type)).filter(Boolean) as FormComponent[];
});
</script>

<template>
  <Card ref="cardRef" class="design-canvas" pt:root="">
    <template #title>Form Components</template>
    <template #content>
      <div class="flex flex-col gap-4">
        <div>
          <div class="text-xs font-semibold text-lab-general-text-muted uppercase mb-2">Fields</div>
          <div class="grid grid-cols-2 gap-2">
            <DraggableItem
              v-for="component in fieldComponents"
              :key="component.type"
              :component="component"
              @drag-start="$emit('drag-start', component)"
              @drag-end="$emit('drag-end')"
            />
          </div>
        </div>
        <div>
          <div class="text-xs font-semibold text-lab-general-text-muted uppercase mb-2">Containers</div>
          <div class="grid grid-cols-2 gap-2">
            <DraggableItem
              v-for="component in containerComponents"
              :key="component.type"
              :component="component"
              @drag-start="$emit('drag-start', component)"
              @drag-end="$emit('drag-end')"
            />
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
