<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { FormComponent } from '../../../shared/types';
import type { FormGridHorizontalAlign, FormGridVerticalAlign } from '@/shared/forms/form-layout-types';
import type { FormLabelLayout } from '@/shared/forms/form-field-layout';

interface Props {
  component: FormComponent | undefined;
  visible: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (
    e: 'config',
    component: FormComponent,
    layout: {
      hAlign: FormGridHorizontalAlign;
      vAlign: FormGridVerticalAlign;
      labelLayout: FormLabelLayout;
    },
  ): void;
  (e: 'cancel'): void;
  (e: 'update:visible', value: boolean): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const hAlign = ref<FormGridHorizontalAlign>('left');
const vAlign = ref<FormGridVerticalAlign>('top');
const labelLayout = ref<FormLabelLayout>('vertical');

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const hAlignOptions = [
  { label: 'Left', value: 'left' as const },
  { label: 'Center', value: 'center' as const },
  { label: 'Right', value: 'right' as const },
];

const vAlignOptions = [
  { label: 'Top', value: 'top' as const },
  { label: 'Middle', value: 'middle' as const },
  { label: 'Bottom', value: 'bottom' as const },
];

const labelLayoutOptions = [
  { label: 'Vertical', value: 'vertical' as const },
  { label: 'Horizontal', value: 'horizontal' as const },
];

watch(
  () => [props.visible, props.component?.fieldKey] as const,
  ([visible]) => {
    if (!visible || !props.component) {
      return;
    }
    hAlign.value = props.component.hAlign ?? 'left';
    vAlign.value = props.component.vAlign ?? 'top';
    labelLayout.value = props.component.labelLayout ?? 'vertical';
  },
);

function handleConfirm(): void {
  if (!props.component) {
    return;
  }
  emit('config', props.component, {
    hAlign: hAlign.value,
    vAlign: vAlign.value,
    labelLayout: labelLayout.value,
  });
  emit('update:visible', false);
}

function handleCancel(): void {
  emit('cancel');
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    header="Field layout"
    :style="{ width: '420px' }"
    :breakpoints="{ '1500px': '45vw', '576px': '90vw' }"
    :pt="{ root: { id: generateUniqueId('layout-config-dialog') } }"
  >
    <div class="flex flex-col gap-4 text-sm">
      <p class="text-lab-general-text m-0">
        Align the field within its grid cell and choose how the label relates to the control.
      </p>

      <div>
        <label :id="generateUniqueId('layout-h-label')" class="text-xs font-semibold text-lab-general-text-muted uppercase block mb-2">
          Horizontal (in cell)
        </label>
        <SelectButton
          v-model="hAlign"
          :options="hAlignOptions"
          option-label="label"
          option-value="value"
          :pt="{ root: { id: generateUniqueId('layout-h-align') } }"
        />
      </div>

      <div>
        <label :id="generateUniqueId('layout-v-label')" class="text-xs font-semibold text-lab-general-text-muted uppercase block mb-2">
          Vertical (in cell)
        </label>
        <SelectButton
          v-model="vAlign"
          :options="vAlignOptions"
          option-label="label"
          option-value="value"
          :pt="{ root: { id: generateUniqueId('layout-v-align') } }"
        />
      </div>

      <div>
        <label :id="generateUniqueId('layout-label-layout-label')" class="text-xs font-semibold text-lab-general-text-muted uppercase block mb-2">
          Label &amp; control
        </label>
        <SelectButton
          v-model="labelLayout"
          :options="labelLayoutOptions"
          option-label="label"
          option-value="value"
          :pt="{ root: { id: generateUniqueId('layout-label-layout') } }"
        />
        <p class="text-lab-general-text-muted text-xs mt-2 m-0">
          Checkbox controls keep an inline label; cell alignment still applies.
        </p>
      </div>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        :pt="{ root: { id: generateUniqueId('layout-config-cancel') } }"
        @click="handleCancel"
      />
      <Button
        label="Apply"
        :pt="{ root: { id: generateUniqueId('layout-config-apply') } }"
        @click="handleConfirm"
      />
    </template>
  </Dialog>
</template>
