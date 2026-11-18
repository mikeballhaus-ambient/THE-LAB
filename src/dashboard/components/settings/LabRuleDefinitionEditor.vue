<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import type { LabRuleConditionV1, LabRuleDefinitionV1, LabRuleScope } from '@/shared/types/lab-rule';
import { LAB_RULE_DEFINITION_SCHEMA_VERSION } from '@/shared/types/lab-rule';
import type {
  LabDomainEventCatalogEntry,
  LabDomainEventPayloadFieldKind,
} from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { defaultLookupRuleCondition } from '@/shared/utils/lab-integration-write-services';
import LabIntegrationLookupConditionFields from './lab-integrations/LabIntegrationLookupConditionFields.vue';
import { LAB_RULES_EVALUATION_COMPLETED_TYPE } from '@/shared/types/lab-rules-platform';
import { getRuleTriggerEventTypes } from '@/shared/utils/lab-rule-trigger';
import {
  buildRuleConditionPayloadPathOptions,
  collectRuleConditionPayloadFields,
  findRuleConditionPayloadField,
  ruleConditionPayloadPathUseSelect,
  ruleConditionPayloadValueOptions,
} from '@/shared/utils/lab-rule-payload-fields';
import { fetchActivePlatformUsersForClient } from '@/shared/services/platform-user-client';
import type { User } from '@/shared/types/user';
import LabRuleTriggerEventsDnD from './lab-rules/LabRuleTriggerEventsDnD.vue';
import LabRulesEditorSection from './lab-rules/LabRulesEditorSection.vue';
import LabRuleConditionValueField from './lab-rules/LabRuleConditionValueField.vue';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import {
  isPayloadCondition,
  labRuleConditionNeedsValue,
  labRuleConditionOperatorOptions,
  nextLabRuleCondition,
  type LabRulePayloadCondition,
} from '@/shared/utils/lab-rule-condition-operators';

const props = defineProps<{
  modelValue: LabRuleDefinitionV1;
  catalogEntries: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  ruleScope?: LabRuleScope;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LabRuleDefinitionV1];
}>();

const { generateUniqueId } = useUniqueElementId();

const triggerEventTypes = computed(() => getRuleTriggerEventTypes(props.modelValue.trigger));

const payloadFieldDescriptors = computed(() =>
  collectRuleConditionPayloadFields(triggerEventTypes.value, props.catalogEntries),
);

function payloadPathOptionsFor(path: string) {
  return buildRuleConditionPayloadPathOptions(path, payloadFieldDescriptors.value);
}

function payloadValueOptionsFor(path: string) {
  return ruleConditionPayloadValueOptions(path, triggerEventTypes.value, props.catalogEntries);
}

const labUsers = ref<User[]>([]);
const labUsersLoading = ref(false);

const labUserOptions = computed(() =>
  labUsers.value.map((user) => {
    const email = user.email ?? '';
    const label = user.name
      ? email
        ? `${user.name} (${email})`
        : user.name
      : email || `User ${user.userId}`;
    return { label, value: String(user.userId) };
  }),
);

onMounted(() => {
  labUsersLoading.value = true;
  void fetchActivePlatformUsersForClient()
    .then((users) => {
      labUsers.value = users;
    })
    .catch(() => {
      labUsers.value = [];
    })
    .finally(() => {
      labUsersLoading.value = false;
    });
});

function payloadValueKind(path: string): LabDomainEventPayloadFieldKind {
  return (
    findRuleConditionPayloadField(path, triggerEventTypes.value, props.catalogEntries)?.valueKind ??
    'string'
  );
}

function patchDefinition(patch: Partial<LabRuleDefinitionV1>): void {
  emit('update:modelValue', {
    ...props.modelValue,
    schemaVersion: LAB_RULE_DEFINITION_SCHEMA_VERSION,
    ...patch,
  });
}

function onTriggerEventTypes(types: string[]): void {
  patchDefinition({ trigger: { eventTypes: types } });
}

function addCondition(): void {
  const firstPath =
    buildRuleConditionPayloadPathOptions('', payloadFieldDescriptors.value).find(
      (o) => o.value !== '__path_custom__',
    )?.value ?? 'title';
  const next: LabRuleConditionV1[] = [
    ...(props.modelValue.conditions ?? []),
    { kind: 'payload_exists', path: firstPath },
  ];
  patchDefinition({ conditions: next });
}

function updateCondition(index: number, condition: LabRuleConditionV1): void {
  const next = [...(props.modelValue.conditions ?? [])];
  next[index] = condition;
  patchDefinition({ conditions: next });
}

function removeCondition(index: number): void {
  const next = [...(props.modelValue.conditions ?? [])];
  next.splice(index, 1);
  patchDefinition({ conditions: next.length ? next : undefined });
}

/**
 * Operators for the currently selected field.
 *
 * Same type-driven list as the workflow condition editor, so authoring a rule and authoring the same
 * test inside a workflow offers the same options. See `lab-rule-condition-operators.ts`.
 */
function operatorOptionsFor(path: string) {
  const declared = findRuleConditionPayloadField(
    path,
    triggerEventTypes.value,
    props.catalogEntries,
  )?.valueKind;
  return labRuleConditionOperatorOptions(
    declared && declared !== 'unknown' ? declared : undefined,
  );
}

/** Connector-lookup operators, shown when the condition is one of them. */
const LOOKUP_OPERATOR_OPTIONS: { label: string; value: LabRuleConditionV1['kind'] }[] = [
  { label: 'Record field is present', value: 'lookup_field_exists' },
  { label: 'Record field equals', value: 'lookup_field_equals' },
];

function onConditionKindChange(
  index: number,
  condition: LabRuleConditionV1,
  kind: LabRuleConditionV1['kind'],
): void {
  if (kind === 'lookup_field_exists' || kind === 'lookup_field_equals') {
    const recordIdPath =
      buildRuleConditionPayloadPathOptions('', payloadFieldDescriptors.value).find(
        (o) => o.value !== '__path_custom__',
      )?.value ?? 'id';
    updateCondition(
      index,
      defaultLookupRuleCondition(kind, props.integrationServiceCatalog, recordIdPath),
    );
    return;
  }
  // Payload operator: shared builder carries the path over and keeps the value when still relevant.
  updateCondition(index, nextLabRuleCondition(condition, kind, 'title'));
}

const addConditionButtonId = generateUniqueId('rule-add-condition');

function conditionKindPt(index: number) {
  return withFormControlRootId(formSelectPt, generateUniqueId(`rule-cond-kind-${index}`));
}

function conditionPathPt(index: number) {
  return withFormControlRootId(formSelectPt, generateUniqueId(`rule-cond-path-${index}`));
}

function conditionPathCustomPt(index: number) {
  return withFormControlRootId(formInputTextPt, generateUniqueId(`rule-cond-path-custom-${index}`));
}

/** Current value, typed for the value field (presence operators carry none). */
function payloadConditionValue(
  condition: LabRulePayloadCondition,
): string | number | boolean | undefined {
  return 'value' in condition ? condition.value ?? undefined : undefined;
}

/** Persist a new comparison value without changing the operator. */
function onConditionValueChange(
  index: number,
  condition: LabRulePayloadCondition,
  value: string | number | boolean,
): void {
  if (!('value' in condition)) {
    return;
  }
  updateCondition(index, { ...condition, value } as LabRuleConditionV1);
}

/**
 * Persist a new field selection, keeping the operator and value.
 *
 * Same fix as the workflow condition editor: the early `return` for anything other than
 * `payload_exists` / `payload_equals` was a leftover from when those were the only kinds, and it made
 * field changes on every newer operator silently discard themselves.
 */
function onConditionPathChange(index: number, condition: LabRuleConditionV1, path: string): void {
  if (!isPayloadCondition(condition)) {
    return;
  }
  if (!('value' in condition)) {
    updateCondition(index, { ...condition, path } as LabRuleConditionV1);
    return;
  }
  const valueKind = payloadValueKind(path);
  const enumOptions = payloadValueOptionsFor(path);
  let value = condition.value;
  if (enumOptions.length) {
    const current = value != null && value !== '' ? String(value) : '';
    value = enumOptions.some((option) => option.value === current)
      ? current
      : enumOptions[0].value;
  } else if (valueKind === 'userId') {
    value = value != null && value !== '' ? String(value) : '';
  }
  updateCondition(index, { ...condition, path, value } as LabRuleConditionV1);
}

</script>

<template>
  <div class="lab-rule-definition-editor flex flex-col gap-5">
    <LabRulesEditorSection
      :step="2"
      title="When — domain events"
      subtitle="Drag from catalog into triggers. Any selected event can match (OR)."
      variant="input"
    >
      <LabRuleTriggerEventsDnD
        :event-types="triggerEventTypes"
        :catalog-entries="catalogEntries"
        @update:event-types="onTriggerEventTypes"
      />
    </LabRulesEditorSection>

    <LabRulesEditorSection
      :step="3"
      title="And — payload conditions"
      subtitle="Payload filters and live connector lookups (all must pass)."
      variant="conditions"
    >
      <template #head-actions>
        <Button
          :id="addConditionButtonId"
          label="Add"
          icon="pi pi-plus"
          size="small"
          outlined
          @click="addCondition"
        />
      </template>
      <p v-if="!(modelValue.conditions?.length)" class="lab-rules-editor-empty-hint">
        No conditions — matching uses event type and scope only.
      </p>
      <div
        v-for="(condition, index) in modelValue.conditions ?? []"
        :key="index"
        class="lab-rules-condition-row flex-col! items-stretch!"
      >
        <div class="flex flex-wrap items-center gap-2">
          <!-- Field first: the operator list is derived from the field's type. -->
          <Select
            v-if="
              isPayloadCondition(condition) &&
              ruleConditionPayloadPathUseSelect(payloadPathOptionsFor(condition.path))
            "
            :model-value="condition.path"
            :options="payloadPathOptionsFor(condition.path)"
            option-label="label"
            option-value="value"
            class="min-w-[10rem]"
            :pt="conditionPathPt(index)"
            @update:model-value="(path) => path && onConditionPathChange(index, condition, path)"
          />
          <InputText
            v-else-if="isPayloadCondition(condition)"
            :model-value="condition.path"
            placeholder="payload.path"
            class="min-w-[8rem] font-mono text-sm"
            :pt="conditionPathCustomPt(index)"
            @update:model-value="(path) => onConditionPathChange(index, condition, path ?? '')"
          />
          <Select
            v-if="isPayloadCondition(condition)"
            :model-value="condition.kind"
            :options="operatorOptionsFor(condition.path)"
            option-label="label"
            option-value="value"
            class="min-w-[12rem]"
            :pt="conditionKindPt(index)"
            @update:model-value="
              (kind: LabRuleConditionV1['kind']) => onConditionKindChange(index, condition, kind)
            "
          />
          <Select
            v-else
            :model-value="condition.kind"
            :options="LOOKUP_OPERATOR_OPTIONS"
            option-label="label"
            option-value="value"
            class="min-w-[12rem]"
            :pt="conditionKindPt(index)"
            @update:model-value="
              (kind: LabRuleConditionV1['kind']) => onConditionKindChange(index, condition, kind)
            "
          />
          <LabRuleConditionValueField
            v-if="isPayloadCondition(condition) && labRuleConditionNeedsValue(condition.kind)"
            :field-index="index"
            :value-kind="payloadValueKind(condition.path)"
            :enum-options="payloadValueOptionsFor(condition.path)"
            :rule-scope="ruleScope"
            :model-value="payloadConditionValue(condition)"
            :lab-user-options="labUserOptions"
            :users-loading="labUsersLoading"
            @update:model-value="(v) => onConditionValueChange(index, condition, v)"
          />
          <Button
            :id="generateUniqueId(`rule-cond-remove-${index}`)"
            icon="pi pi-trash"
            severity="danger"
            text
            @click="removeCondition(index)"
          />
        </div>
        <LabIntegrationLookupConditionFields
          v-if="condition.kind === 'lookup_field_exists' || condition.kind === 'lookup_field_equals'"
          :condition="condition"
          :field-key="`rule-${index}`"
          :integration-service-catalog="integrationServiceCatalog"
          :payload-path-options="payloadPathOptionsFor(condition.recordIdPath)"
          :lab-user-options="labUserOptions"
          @update:condition="(next) => updateCondition(index, next)"
        />
      </div>
    </LabRulesEditorSection>

    <LabRulesEditorSection
      :step="4"
      title="Then — evaluation output"
      variant="output"
    >
      <p class="lab-rules-output-copy">
        On match, the platform publishes
        <code class="lab-rules-output-code">{{ LAB_RULES_EVALUATION_COMPLETED_TYPE }}</code>
        with <strong>evaluated facts</strong> from your condition paths. Wire notifications,
        approvals, and policies in Workflow Studio.
      </p>
    </LabRulesEditorSection>
  </div>
</template>
