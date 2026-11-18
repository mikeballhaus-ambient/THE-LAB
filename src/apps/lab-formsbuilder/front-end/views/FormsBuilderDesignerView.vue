<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DesignCanvas from '../components/form-designer/DesignCanvas.vue';
import ComponentLibrary from '../components/form-designer/ComponentLibrary.vue';
import PropertyEditor from '../components/PropertyEditor.vue';
import FormActionsSettings from '../components/FormActionsSettings.vue';
import ConnectorManager from '../components/ConnectorManager.vue';
import FormConnectorDialog from '../components/FormConnectorDialog.vue';
import type { DataConnector, FormComponent, FormSchema } from '@/apps/lab-formsbuilder/shared/types';
import { computed, nextTick, ref, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';

const formActionsPreviewEditMode = defineModel<boolean>('formActionsPreviewEditMode', { required: true });
const connectorDialogVisible = defineModel<boolean>('connectorDialogVisible', { required: true });
const currentFormSchema = defineModel<FormSchema>('currentFormSchema', { required: true });

defineProps<{
  generateUniqueId: (prefix: string) => string;
  serverUrl: string;
  canEditFormName: boolean;
  loadedConnectors: DataConnector[];
  selectedComponentForEditor: FormComponent | null;
  linkedConnectorForEditor: DataConnector | null;
  connectorDialogTarget: DataConnector | null;
}>();

const designCanvasRef = ref<InstanceType<typeof DesignCanvas> | null>(null);
const formPropertiesCardRef = ref<InstanceType<typeof Card> | null>(null);
const DESIGNER_CONNECTOR_FALLBACK_PX = 280;

const connectorPanelHeightPx = ref<number>(DESIGNER_CONNECTOR_FALLBACK_PX);

const connectorShellStyle = computed(() => {
  const height = connectorPanelHeightPx.value;
  return {
    width: '17rem',
    height: `${height}px`,
    maxHeight: `${height}px`,
    minHeight: '0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  } as const;
});

const formPropertiesCardEl = computed(() => {
  const root = (formPropertiesCardRef.value as { $el?: HTMLElement } | null)?.$el;
  return root instanceof HTMLElement ? root : null;
});

function syncConnectorPanelHeight(): void {
  const el = formPropertiesCardEl.value;
  if (!el) {
    return;
  }
  const height = Math.ceil(el.getBoundingClientRect().height);
  if (height > 0) {
    connectorPanelHeightPx.value = height;
  }
}

useResizeObserver(formPropertiesCardEl, () => {
  syncConnectorPanelHeight();
});

watch(formPropertiesCardEl, async (el) => {
  if (!el) {
    return;
  }
  await nextTick();
  syncConnectorPanelHeight();
});

defineExpose({ designCanvasRef });

defineEmits<{
  back: [];
  'update:formActionsPreviewEditMode': [value: boolean];
  'update:connectorDialogVisible': [value: boolean];
  'component-drop': [component: FormComponent];
  'component-remove': [fieldKey: string];
  'component-select': [component: FormComponent];
  'canvas-clear': [];
  'update-component': [component: FormComponent];
  'configure-layout': [];
  'configure-span': [];
  'connector-select': [connectorId: number];
  'open-linked-connector': [];
  autopopulate: [];
  'save-form': [];
  link: [payload: { connector: DataConnector; autopopulate: boolean }];
  unlink: [];
  'refresh-complete': [form: FormSchema];
}>();
</script>

<template>
  <div class="w-full">
    <div class="flex justify-between items-center mb-4 border-b pb-2">
      <h2 :id="generateUniqueId('form-designer-heading')" class="text-lg font-semibold text-lab-general-text">Form Designer</h2>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        severity="secondary"
        @click="$emit('back')"
        :pt="{ root: { id: generateUniqueId('form-designer-back-btn') } }"
      />
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex gap-4 w-full items-start designer-top-panels">
        <div class="form-properties-panel min-w-0 flex-1">
        <Card
          ref="formPropertiesCardRef"
          class="w-full"
          pt:root="w-full! flex flex-col bg-lab-general-bg! border! border-lab-general-border! text-lab-general-text!"
          pt:body="text-lab-general-text!"
          pt:content="text-lab-general-text!"
          pt:title="hidden!"
        >
          <template #content>
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap gap-x-2 gap-y-2 items-center min-w-0">
                <label
                  class="min-w-[100px]! shrink-0 text-lab-general-text"
                  :id="generateUniqueId('form-name-label')"
                  for="form-name-input"
                  >Form Name: *</label
                >
                <InputText
                  v-model="currentFormSchema.name"
                  :disabled="!canEditFormName"
                  placeholder="e.g., Customer Order Form"
                  class="w-[200px] shrink-0"
                  :pt="{ root: { id: generateUniqueId('form-name-input') } }"
                />
                <template v-if="currentFormSchema.formKey">
                  <span class="text-sm text-lab-general-text-muted shrink-0" :id="generateUniqueId('form-key-label')"
                    >Form key:</span
                  >
                  <code
                    class="text-xs font-mono text-lab-general-text truncate min-w-0 max-w-full sm:max-w-md px-2 py-1 rounded bg-lab-general-bg-muted border border-lab-general-border"
                    :title="currentFormSchema.formKey"
                    :id="generateUniqueId('form-key-display')"
                    >{{ currentFormSchema.formKey }}</code
                  >
                </template>
              </div>

              <div class="flex gap-2 items-start">
                <label class="min-w-[100px]! text-lab-general-text" :id="generateUniqueId('form-description-label')" for="form-description-input"
                  >Description:</label
                >
                <Textarea
                  v-model="currentFormSchema.description"
                  placeholder="Describe what this form is used for..."
                  class="w-full"
                  :rows="3"
                  :pt="{ root: { id: generateUniqueId('form-description-input') } }"
                />
              </div>

              <div class="border-t border-lab-general-border pt-3 mt-1">
                <FormActionsSettings
                  v-model="currentFormSchema.formActions"
                  :preview-edit-mode="formActionsPreviewEditMode"
                  @update:preview-edit-mode="$emit('update:formActionsPreviewEditMode', $event)"
                />
              </div>
            </div>
          </template>
        </Card>
        </div>

        <div
          class="designer-connector-shell shrink-0"
          :style="connectorShellStyle"
          :id="generateUniqueId('designer-connector-shell')"
        >
          <ConnectorManager
            class="w-full h-full min-h-0 min-w-0"
            layout="compact"
            constrain-height
            :connectors="loadedConnectors"
            :show-add-button="false"
            :selected-connector-id="currentFormSchema.dataConnecter?.id ?? null"
            :form-linked-connector-id="currentFormSchema.dataConnecter?.id ?? null"
            @connector-select="$emit('connector-select', $event)"
          />
        </div>
      </div>
      <div class="flex gap-4">
        <ComponentLibrary />
        <DesignCanvas
          ref="designCanvasRef"
          :schema="currentFormSchema"
          :selected-field-key="selectedComponentForEditor?.fieldKey ?? null"
          :form-actions-preview-edit-mode="formActionsPreviewEditMode"
          @component-drop="$emit('component-drop', $event)"
          @component-remove="$emit('component-remove', $event)"
          @component-select="$emit('component-select', $event)"
          @canvas-clear="$emit('canvas-clear')"
        />
        <PropertyEditor
          v-if="selectedComponentForEditor"
          :selected-component="selectedComponentForEditor"
          :linked-connector="linkedConnectorForEditor"
          :all-components="currentFormSchema.components"
          @update="$emit('update-component', $event)"
          @configure-layout="$emit('configure-layout')"
          @configure-span="$emit('configure-span')"
        />
      </div>
      <div class="p-3 border-t flex flex-wrap justify-center items-center gap-2">
        <Button
          v-if="currentFormSchema.dataConnecter"
          label="Connector options"
          icon="pi pi-link"
          severity="secondary"
          @click="$emit('open-linked-connector')"
          :pt="{ root: { id: generateUniqueId('connector-options-btn') } }"
        />
        <Button
          v-if="currentFormSchema.dataConnecter"
          label="Autopopulate from model"
          icon="pi pi-table"
          severity="secondary"
          outlined
          @click="$emit('autopopulate')"
          :pt="{ root: { id: generateUniqueId('autopopulate-form-btn') } }"
        />
        <Button
          label="Save Form"
          icon="pi pi-check"
          severity="success"
          @click="$emit('save-form')"
          :pt="{ root: { id: generateUniqueId('save-form-btn') } }"
        />
      </div>

      <FormConnectorDialog
        :visible="connectorDialogVisible"
        :server-url="serverUrl"
        :form-key="currentFormSchema.formKey"
        :form-id="currentFormSchema.id"
        :connector="connectorDialogTarget"
        :linked-connector="currentFormSchema.dataConnecter ?? null"
        @update:visible="$emit('update:connectorDialogVisible', $event)"
        @link="$emit('link', $event)"
        @unlink="$emit('unlink')"
        @autopopulate="$emit('autopopulate')"
        @refresh-complete="$emit('refresh-complete', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.designer-connector-shell {
  align-self: flex-start;
}

.designer-connector-shell :deep(.connector-manager--constrained) {
  height: 100%;
  max-height: 100%;
  min-height: 0;
}
</style>
