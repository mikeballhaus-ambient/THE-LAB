<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import {
  DEFAULT_FORM_ACTIONS_CONFIG,
  FORM_ACTIONS_BAR_ALIGN_OPTIONS,
  FORM_ACTIONS_BAR_GAP_OPTIONS,
  FORM_ACTIONS_PRIMARY_PRESETS,
  FORM_ACTIONS_SECONDARY_PRESETS,
  FormActionsBar,
  normalizeFormActionsConfig,
  type FormActionsConfig,
} from '@/shared/forms';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';

const props = defineProps<{
  modelValue?: FormActionsConfig | null;
  /** When true, preview primary button shows updateLabel */
  previewEditMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormActionsConfig): void;
  (e: 'update:previewEditMode', value: boolean): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const showSaveCheckboxId = generateUniqueId('form-actions-show-save');
const showCancelCheckboxId = generateUniqueId('form-actions-show-cancel');
const previewEditCheckboxId = generateUniqueId('form-actions-preview-edit');
const saveLabelFieldId = generateUniqueId('form-actions-save-label-input');
const updateLabelFieldId = generateUniqueId('form-actions-update-label-input');
const cancelLabelFieldId = generateUniqueId('form-actions-cancel-label-input');
const barAlignSelectId = generateUniqueId('form-actions-bar-align');
const barGapSelectId = generateUniqueId('form-actions-bar-gap');
const primaryPresetSelectId = generateUniqueId('form-actions-primary-preset');
const secondaryPresetSelectId = generateUniqueId('form-actions-secondary-preset');
const previewPrimaryId = generateUniqueId('form-actions-preview-primary');
const previewCancelId = generateUniqueId('form-actions-preview-cancel');

const expanded = ref(false);

function toggleExpanded(): void {
  expanded.value = !expanded.value;
}

const draft = computed({
  get: () => normalizeFormActionsConfig(props.modelValue),
  set: (value: FormActionsConfig) => emit('update:modelValue', value),
});

const barAlignUi = computed({
  get: () => {
    const align = draft.value.barAlign ?? 'right';
    if (align === 'left') return 'justify-start';
    if (align === 'center') return 'justify-center';
    return 'justify-end';
  },
  set: (justify: string) => {
    const barAlign =
      justify === 'justify-start' ? 'left' : justify === 'justify-center' ? 'center' : 'right';
    patchDraft({ barAlign });
  },
});

const primaryPreset = computed({
  get: () =>
    FORM_ACTIONS_PRIMARY_PRESETS.find(p => p.value === draft.value.primaryButton?.customClasses)
      ?.value ?? FORM_ACTIONS_PRIMARY_PRESETS[0].value,
  set: (value: string) => {
    patchDraft({ primaryButton: { customClasses: value } });
  },
});

const secondaryPreset = computed({
  get: () =>
    FORM_ACTIONS_SECONDARY_PRESETS.find(p => p.value === draft.value.secondaryButton?.customClasses)
      ?.value ?? FORM_ACTIONS_SECONDARY_PRESETS[0].value,
  set: (value: string) => {
    patchDraft({ secondaryButton: { customClasses: value } });
  },
});

function patchDraft(partial: Partial<FormActionsConfig>): void {
  draft.value = normalizeFormActionsConfig({ ...draft.value, ...partial });
}

watch(
  () => props.modelValue,
  (value) => {
    if (value == null) {
      emit('update:modelValue', { ...DEFAULT_FORM_ACTIONS_CONFIG });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="form-actions-settings text-sm">
    <button
      type="button"
      :id="generateUniqueId('form-actions-section-toggle')"
      class="form-actions-settings-toggle flex w-full items-center gap-2 text-left text-sm font-semibold text-lab-general-text py-1 rounded hover:bg-lab-general-bg-muted"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <i
        class="pi text-xs text-lab-general-text-muted"
        :class="expanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        aria-hidden="true"
      />
      <span>Form actions (runtime)</span>
    </button>

    <div v-show="expanded" class="flex flex-col gap-3 pt-2">
    <p class="text-lab-general-text-muted text-xs m-0">
      Save, update, and cancel appear below the field grid at runtime (FormMounter). They are not
      canvas components.
    </p>

    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex items-center gap-2">
        <Checkbox
          :model-value="draft.showSave !== false"
          binary
          :input-id="showSaveCheckboxId"
          @update:model-value="(v: boolean) => patchDraft({ showSave: v })"
        />
        <label :id="generateUniqueId('form-actions-show-save-label')" :for="showSaveCheckboxId" class="text-lab-general-text">Show save/update</label>
      </div>
      <div class="flex items-center gap-2">
        <Checkbox
          :model-value="draft.showCancel !== false"
          binary
          :input-id="showCancelCheckboxId"
          @update:model-value="(v: boolean) => patchDraft({ showCancel: v })"
        />
        <label :id="generateUniqueId('form-actions-show-cancel-label')" :for="showCancelCheckboxId" class="text-lab-general-text">Show cancel</label>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2">
      <label :id="generateUniqueId('form-actions-save-label-caption')" :for="saveLabelFieldId" class="text-lab-general-text text-xs">Save label</label>
      <InputText
        :model-value="draft.saveLabel"
        class="w-full"
        :pt="{ root: { id: saveLabelFieldId } }"
        @update:model-value="(v?: string) => patchDraft({ saveLabel: v ?? 'Save' })"
      />
      <label :id="generateUniqueId('form-actions-update-label-caption')" :for="updateLabelFieldId" class="text-lab-general-text text-xs">Update label</label>
      <InputText
        :model-value="draft.updateLabel"
        class="w-full"
        :pt="{ root: { id: updateLabelFieldId } }"
        @update:model-value="(v?: string) => patchDraft({ updateLabel: v ?? 'Update' })"
      />
      <label :id="generateUniqueId('form-actions-cancel-label-caption')" :for="cancelLabelFieldId" class="text-lab-general-text text-xs">Cancel label</label>
      <InputText
        :model-value="draft.cancelLabel"
        class="w-full"
        :pt="{ root: { id: cancelLabelFieldId } }"
        @update:model-value="(v?: string) => patchDraft({ cancelLabel: v ?? 'Cancel' })"
      />
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div>
        <label :id="generateUniqueId('form-actions-bar-align-caption')" :for="barAlignSelectId" class="text-lab-general-text text-xs block mb-1">Bar alignment</label>
        <Select
          v-model="barAlignUi"
          :options="[...FORM_ACTIONS_BAR_ALIGN_OPTIONS]"
          option-label="label"
          option-value="value"
          class="w-full"
          :pt="{ root: { id: barAlignSelectId } }"
        />
      </div>
      <div>
        <label :id="generateUniqueId('form-actions-bar-gap-caption')" :for="barGapSelectId" class="text-lab-general-text text-xs block mb-1">Button gap</label>
        <Select
          :model-value="draft.barGap"
          :options="[...FORM_ACTIONS_BAR_GAP_OPTIONS]"
          option-label="label"
          option-value="value"
          class="w-full"
          :pt="{ root: { id: barGapSelectId } }"
          @update:model-value="(v?: string) => patchDraft({ barGap: v ?? 'gap-2' })"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2">
      <label :id="generateUniqueId('form-actions-primary-preset-caption')" :for="primaryPresetSelectId" class="text-lab-general-text text-xs">Primary button style</label>
      <Select
        v-model="primaryPreset"
        :options="[...FORM_ACTIONS_PRIMARY_PRESETS]"
        option-label="label"
        option-value="value"
        class="w-full"
        :pt="{ root: { id: primaryPresetSelectId } }"
      />
      <label :id="generateUniqueId('form-actions-secondary-preset-caption')" :for="secondaryPresetSelectId" class="text-lab-general-text text-xs">Secondary button style</label>
      <Select
        v-model="secondaryPreset"
        :options="[...FORM_ACTIONS_SECONDARY_PRESETS]"
        option-label="label"
        option-value="value"
        class="w-full"
        :pt="{ root: { id: secondaryPresetSelectId } }"
      />
    </div>

    <div class="flex items-center gap-2">
      <Checkbox
        :model-value="previewEditMode === true"
        binary
        :input-id="previewEditCheckboxId"
        @update:model-value="(v: boolean) => emit('update:previewEditMode', v)"
      />
      <label :id="generateUniqueId('form-actions-preview-edit-label')" :for="previewEditCheckboxId" class="text-lab-general-text text-xs">
        Preview shows update label (edit mode)
      </label>
    </div>

    <div class="rounded-md border border-lab-general-border p-3 bg-lab-general-bg-muted">
      <p class="text-lab-general-text-muted text-xs m-0 mb-2">Live preview</p>
      <FormActionsBar
        :config="draft"
        :is-edit-mode="previewEditMode === true"
        preview-mode
        :primary-id="previewPrimaryId"
        :cancel-id="previewCancelId"
      />
    </div>
    </div>
  </div>
</template>
