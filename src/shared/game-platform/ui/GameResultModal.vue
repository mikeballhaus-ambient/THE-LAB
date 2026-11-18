<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

defineProps<{
  visible: boolean;
  title: string;
  message: string;
  personalBest?: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  lobby: [];
  again: [];
}>();

const { generateUniqueId } = useUniqueElementId();
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="title"
    class="tw-result-dialog"
    :pt="{ root: { attrs: { id: generateUniqueId('tw-result-dialog') } } }"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="m-0 text-lab-general-text">{{ message }}</p>
    <p v-if="personalBest" class="text-emerald-400 text-sm mt-2 m-0">New personal best!</p>
    <template #footer>
      <Button
        label="Lobby"
        severity="secondary"
        :pt="{ root: { attrs: { id: generateUniqueId('tw-result-lobby') } } }"
        @click="emit('lobby')"
      />
      <Button
        label="Play again"
        :pt="{ root: { attrs: { id: generateUniqueId('tw-result-again') } } }"
        @click="emit('again')"
      />
    </template>
  </Dialog>
</template>
