<script setup lang="ts">
import { computed, provide, type Component } from 'vue';
import type { IFormRuntimeField } from './form-runtime-types';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useFormFieldModel } from './useFormFieldModel';
import { FORM_RUNTIME_READ_ONLY_KEY } from './form-runtime-readonly';
import InputTextControl from './controls/InputText.vue';
import SelectControl from './controls/Select.vue';
import CheckboxControl from './controls/Checkbox.vue';
import RadioButtonControl from './controls/RadioButton.vue';
import DatePickerControl from './controls/DatePicker.vue';
import TextareaControl from './controls/Textarea.vue';
import NumberInputControl from './controls/NumberInput.vue';
import MultiSelectControl from './controls/MultiSelect.vue';
import LabelControl from './controls/Label.vue';
import GroupFieldControl from './containers/GroupField.vue';
import TabsFieldControl from './containers/TabsField.vue';
import LabApprovalPolicyStepsField from './controls/LabApprovalPolicyStepsField.vue';
import LabCollapsibleJsonField from './controls/LabCollapsibleJsonField.vue';
import LabRuleDefinitionGuideField from './controls/LabRuleDefinitionGuideField.vue';
import LabWorkflowDefinitionGuideField from './controls/LabWorkflowDefinitionGuideField.vue';
import LabKanbanBoardColumnsField from './controls/LabKanbanBoardColumnsField.vue';

const props = defineProps<{
  field: IFormRuntimeField;
}>();

const { generateUniqueId } = useUniqueElementId();
const isHidden = computed(() => props.field.hidden === true);
const fieldReadOnly = computed(() => props.field.readOnly === true);
provide(FORM_RUNTIME_READ_ONLY_KEY, fieldReadOnly);
const hiddenModel = useFormFieldModel(props.field);

function serializeHiddenValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function onHiddenInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  if (props.field.type === 'NumberInput') {
    hiddenModel.value = raw === '' ? undefined : Number(raw);
    return;
  }
  if (props.field.type === 'Checkbox') {
    hiddenModel.value = raw === 'true';
    return;
  }
  hiddenModel.value = raw;
}

const CONTROL_BY_TYPE: Record<string, Component> = {
  InputText: InputTextControl,
  Select: SelectControl,
  Checkbox: CheckboxControl,
  RadioButton: RadioButtonControl,
  DatePicker: DatePickerControl,
  Textarea: TextareaControl,
  NumberInput: NumberInputControl,
  MultiSelect: MultiSelectControl,
  Label: LabelControl,
  Group: GroupFieldControl,
  Tabs: TabsFieldControl,
  LabApprovalPolicySteps: LabApprovalPolicyStepsField,
  LabCollapsibleJson: LabCollapsibleJsonField,
  LabRuleDefinitionGuide: LabRuleDefinitionGuideField,
  LabWorkflowDefinitionGuide: LabWorkflowDefinitionGuideField,
  LabKanbanBoardColumns: LabKanbanBoardColumnsField,
};

const controlComponent = computed(() => CONTROL_BY_TYPE[props.field.type]);
</script>

<template>
  <input
    v-if="isHidden && field.fieldKey"
    type="hidden"
    :id="generateUniqueId(`form-hidden-${field.fieldKey}`)"
    :value="serializeHiddenValue(hiddenModel)"
    @input="onHiddenInput"
  />
  <component
    :is="controlComponent"
    v-else-if="controlComponent"
    :field="field"
  />
  <div v-else class="text-sm text-red-400">
    Unsupported control type: {{ field.type }}
  </div>
</template>
