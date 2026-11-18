<script setup lang="ts">
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import {
  labRecordActionRootAttrs,
  type LabRecordAutomationAction,
} from '@/shared/constants/lab-record-automation';

const props = withDefaults(
  defineProps<{
    recordId: string | number;
    recordName?: string;
    /** Prefix segment before action + record id in element ids (e.g. `lab-workflows`). */
    idPrefix?: string;
    showEdit?: boolean;
    showDelete?: boolean;
    size?: 'small' | 'large';
  }>(),
  {
    idPrefix: 'record',
    showEdit: true,
    showDelete: true,
    size: 'small',
  },
);

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

const { generateUniqueId } = useUniqueElementId();

function actionRootAttrs(action: LabRecordAutomationAction): Record<string, string> {
  return labRecordActionRootAttrs(action, props.recordId, props.recordName);
}

function actionPt(action: LabRecordAutomationAction) {
  return {
    root: {
      attrs: {
        id: generateUniqueId(`${props.idPrefix}-${action}-${props.recordId}`),
      },
    },
  };
}
</script>

<template>
  <div class="lab-record-row-actions flex flex-row flex-nowrap items-center justify-end gap-1">
    <Button
      v-if="showEdit"
      v-bind="actionRootAttrs('edit')"
      icon="pi pi-pencil"
      text
      :size="size"
      :pt="actionPt('edit')"
      @click="emit('edit')"
    />
    <Button
      v-if="showDelete"
      v-bind="actionRootAttrs('delete')"
      icon="pi pi-trash"
      text
      severity="danger"
      :size="size"
      :pt="actionPt('delete')"
      @click="emit('delete')"
    />
  </div>
</template>
