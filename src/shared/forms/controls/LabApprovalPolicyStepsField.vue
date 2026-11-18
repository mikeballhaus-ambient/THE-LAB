<script setup lang="ts">
import { inject, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import type { IFormRuntimeField } from '@/shared/forms/form-runtime-types';
import FormFieldShell from '@/shared/forms/FormFieldShell.vue';
import { FORM_RUNTIME_VALUES_KEY } from '@/shared/forms/form-runtime-values';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formInputTextPt } from '@/shared/forms/form-control-pt';
import { useFormFieldReadOnly } from '@/shared/forms/form-runtime-readonly';
import LabPlatformUserSelect from './LabPlatformUserSelect.vue';
import {
  ApprovalPolicyStepDraft,
  LAB_APPROVAL_POLICY_MAX_STEPS,
  LAB_APPROVAL_POLICY_MIN_STEPS,
  defaultApprovalPolicyStepDraft,
  hydrateApprovalPolicyStepsFromFormValues,
  serializeApprovalPolicyDefinitionJson,
} from '@/shared/forms/approval-policy-steps-form';

defineProps<{
  field: IFormRuntimeField;
}>();

const { generateUniqueId } = useUniqueElementId();
const readOnly = useFormFieldReadOnly();
const store = inject(FORM_RUNTIME_VALUES_KEY);

const steps = ref<ApprovalPolicyStepDraft[]>([defaultApprovalPolicyStepDraft()]);

function syncDefinitionJsonToStore(): void {
  if (!store) {
    return;
  }
  store.setValue('definitionJson', serializeApprovalPolicyDefinitionJson(steps.value));
  const s0 = steps.value[0];
  const s1 = steps.value[1];
  store.setValue('step1AssigneeUserId', s0?.assigneeUserId ?? undefined);
  store.setValue('step1Label', s0?.label?.trim() || undefined);
  store.setValue('step2AssigneeUserId', s1?.assigneeUserId ?? undefined);
  store.setValue('step2Label', s1?.label?.trim() || undefined);
}

function loadStepsFromStore(): void {
  if (!store) {
    return;
  }
  steps.value = hydrateApprovalPolicyStepsFromFormValues((key) => store.getValue(key));
}

function addStep(): void {
  if (steps.value.length >= LAB_APPROVAL_POLICY_MAX_STEPS) {
    return;
  }
  steps.value = [...steps.value, defaultApprovalPolicyStepDraft()];
}

function removeStep(index: number): void {
  if (steps.value.length <= LAB_APPROVAL_POLICY_MIN_STEPS) {
    return;
  }
  steps.value = steps.value.filter((_, i) => i !== index);
}

onMounted(() => {
  loadStepsFromStore();
  syncDefinitionJsonToStore();
});

watch(
  steps,
  () => {
    syncDefinitionJsonToStore();
  },
  { deep: true },
);

watch(
  () => store?.getValue('definitionJson'),
  () => {
    const hydrated = hydrateApprovalPolicyStepsFromFormValues((key) => store?.getValue(key) ?? undefined);
    const current = JSON.stringify(steps.value);
    const next = JSON.stringify(hydrated);
    if (current !== next) {
      steps.value = hydrated;
    }
  },
);
</script>

<template>
  <FormFieldShell :source="field">
    <p
      class="lab-form-section__lead m-0"
      :id="generateUniqueId('policy-steps-lead')"
    >
      Each step is approved by one lab user, in order. Add a short name so assignees know what they
      are approving.
    </p>

    <div class="flex justify-end mt-2 mb-1">
      <Button
        type="button"
        label="Add step"
        icon="pi pi-plus"
        size="small"
        severity="secondary"
        outlined
        :disabled="readOnly || steps.length >= LAB_APPROVAL_POLICY_MAX_STEPS"
        :pt="{ root: { attrs: { id: generateUniqueId('policy-steps-add') } } }"
        @click="addStep"
      />
    </div>

    <div
      class="lab-form-section__children flex flex-col gap-2"
      :id="generateUniqueId('policy-steps-list')"
    >
      <section
        v-for="(step, index) in steps"
        :key="index"
        :id="generateUniqueId(`policy-step-section-${index}`)"
        class="lab-form-section lab-form-section--nested lab-approval-policy-step mb-0"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <h4
            class="lab-form-section__title m-0 min-w-0 text-xs normal-case tracking-normal text-lab-general-text"
            :id="generateUniqueId(`policy-step-title-${index}`)"
          >
            <span class="lab-form-section__step" aria-hidden="true">{{ index + 1 }}</span>
            Step {{ index + 1 }}
          </h4>
          <Button
            v-if="steps.length > LAB_APPROVAL_POLICY_MIN_STEPS"
            type="button"
            label="Remove"
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            :disabled="readOnly"
            :pt="{ root: { attrs: { id: generateUniqueId(`policy-step-remove-${index}`) } } }"
            @click="removeStep(index)"
          />
        </div>

        <div class="grid gap-2 sm:grid-cols-2 mt-3">
          <div class="flex flex-col gap-1">
            <label
              class="text-sm font-medium text-lab-general-text"
              :for="generateUniqueId(`policy-step-label-${index}`)"
            >
              Step name
            </label>
            <InputText
              v-model="step.label"
              :disabled="readOnly"
              placeholder="e.g. Manager approval"
              class="w-full"
              :pt="formInputTextPt"
              :input-id="generateUniqueId(`policy-step-label-${index}`)"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-lab-general-text">
              Assignee<span v-if="index === 0" class="text-lab-danger-text">*</span>
            </label>
            <LabPlatformUserSelect
              v-model="step.assigneeUserId"
              :disabled="readOnly"
              placeholder="Select approver"
              :input-id="generateUniqueId(`policy-step-user-${index}`)"
            />
          </div>
        </div>
      </section>
    </div>

    <p
      v-if="steps.length >= LAB_APPROVAL_POLICY_MAX_STEPS"
      class="lab-form-section__lead m-0 mt-2"
      :id="generateUniqueId('policy-steps-max-hint')"
    >
      Maximum of {{ LAB_APPROVAL_POLICY_MAX_STEPS }} steps per policy.
    </p>
  </FormFieldShell>
</template>

