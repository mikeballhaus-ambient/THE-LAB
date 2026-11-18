<script setup lang="ts">
import { computed } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { defaultLookupRuleCondition } from '@/shared/utils/lab-integration-write-services';
import {
  buildRuleConditionPayloadPathOptions,
  collectRuleConditionPayloadFields,
  findRuleConditionPayloadField,
  ruleConditionPayloadPathUseSelect,
  ruleConditionPayloadValueOptions,
} from '@/shared/utils/lab-rule-payload-fields';
import LabRuleConditionValueField from '../lab-rules/LabRuleConditionValueField.vue';
import LabIntegrationLookupConditionFields from '../lab-integrations/LabIntegrationLookupConditionFields.vue';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import type { LabDomainEventPayloadFieldKind } from '@/shared/types/lab-domain-event-catalog';
import {
  isPayloadCondition,
  labRuleConditionNeedsValue,
  labRuleConditionOperatorOptions,
  labRuleValueKindFromJsonType,
  nextLabRuleCondition,
  type LabRulePayloadCondition,
} from '@/shared/utils/lab-rule-condition-operators';
import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';
import { capturedPayloadFieldPaths } from '@/shared/utils/lab-workflow-captured-payload-fields';

const props = defineProps<{
  conditions: LabRuleConditionV1[];
  combine?: 'all' | 'any';
  showCombine?: boolean;
  triggerEventType: string;
  catalogEntries: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  labUserOptions: { label: string; value: string }[];
  fieldKeyPrefix: string;
  /** Paths from a captured trigger payload (webhook Listen, saved samples). */
  capturedPayloadFields?: CapturedPayloadField[];
}>();

const emit = defineEmits<{
  'update:conditions': [conditions: LabRuleConditionV1[]];
  'update:combine': [combine: 'all' | 'any'];
}>();

const { generateUniqueId } = useUniqueElementId();


/** The connector-lookup operators, offered when the current condition is one of them. */
const LOOKUP_OPERATOR_OPTIONS: { label: string; value: LabRuleConditionV1['kind'] }[] = [
  { label: 'Record field is present', value: 'lookup_field_exists' },
  { label: 'Record field equals', value: 'lookup_field_equals' },
];

const combineOptions = [
  { label: 'Match all conditions', value: 'all' as const },
  { label: 'Match any condition', value: 'any' as const },
];

const payloadFieldDescriptors = computed(() =>
  collectRuleConditionPayloadFields(
    props.triggerEventType ? [props.triggerEventType] : [],
    props.catalogEntries,
    capturedPayloadFieldPaths(props.capturedPayloadFields ?? []),
  ),
);

const triggerEventTypes = computed(() =>
  props.triggerEventType ? [props.triggerEventType] : [],
);

function payloadPathOptionsFor(path: string) {
  return buildRuleConditionPayloadPathOptions(path, payloadFieldDescriptors.value);
}

function payloadValueOptionsFor(path: string) {
  return ruleConditionPayloadValueOptions(path, triggerEventTypes.value, props.catalogEntries);
}

function payloadValueKind(path: string) {
  return (
    findRuleConditionPayloadField(path, triggerEventTypes.value, props.catalogEntries)?.valueKind ??
    'string'
  );
}

function patchConditions(next: LabRuleConditionV1[]): void {
  emit('update:conditions', next);
}

function updateCondition(index: number, next: LabRuleConditionV1): void {
  const conditions = [...props.conditions];
  conditions[index] = next;
  patchConditions(conditions);
}

function removeCondition(index: number): void {
  patchConditions(props.conditions.filter((_, i) => i !== index));
}

function addCondition(): void {
  const options = buildRuleConditionPayloadPathOptions('', payloadFieldDescriptors.value);
  const firstPath = options.find((o) => o.value !== '__path_custom__')?.value ?? 'assigneeId';
  patchConditions([...props.conditions, { kind: 'payload_exists', path: firstPath }]);
}

/**
 * Operators valid for the currently selected field.
 *
 * Driven by the field's declared `valueKind` (or the captured JSON type for a webhook), so a number
 * offers ordering tests and a boolean does not. See `lab-rule-condition-operators.ts` for why the
 * list is typed rather than fixed.
 */
function operatorOptionsFor(path: string) {
  return labRuleConditionOperatorOptions(payloadValueKindTyped(path));
}

/**
 * `payloadValueKind` falls back to `string`; here the fallback must stay distinguishable so an
 * undeclared custom path still gets the full operator list.
 */
function payloadValueKindTyped(path: string): LabDomainEventPayloadFieldKind | undefined {
  const declared = findRuleConditionPayloadField(
    path,
    triggerEventTypes.value,
    props.catalogEntries,
  )?.valueKind;
  if (declared && declared !== 'unknown') {
    return declared;
  }
  const captured = props.capturedPayloadFields?.find((field) => field.path === path);
  if (captured) {
    return labRuleValueKindFromJsonType(captured.type);
  }
  return undefined;
}

/**
 * Switch operator, carrying over as much of the old condition as the new shape allows.
 *
 * Delegates to the shared builder so this editor and the Rules engine editor cannot drift.
 */
function onConditionOperatorChange(
  index: number,
  condition: LabRuleConditionV1,
  nextKind: LabRuleConditionV1['kind'],
): void {
  const fallbackPath =
    buildRuleConditionPayloadPathOptions('', payloadFieldDescriptors.value).find(
      (o) => o.value !== '__path_custom__',
    )?.value ?? 'id';
  updateCondition(index, nextLabRuleCondition(condition, nextKind, fallbackPath));
}

/** Whether the current operator renders a value control at all. */
function conditionNeedsValue(condition: LabRuleConditionV1): boolean {
  if (condition.kind === 'lookup_field_equals') {
    return true;
  }
  return labRuleConditionNeedsValue(condition.kind);
}

/**
 * Current comparison value, typed for the value field.
 *
 * `payload_exists` / `payload_missing` carry no value, so this returns `undefined` for them rather
 * than reaching for a property that does not exist on those union members.
 */
function payloadConditionValue(
  condition: LabRulePayloadCondition,
): string | number | boolean | undefined {
  return 'value' in condition ? condition.value ?? undefined : undefined;
}

/**
 * Persist a new comparison value without changing the operator.
 *
 * The operator is re-emitted explicitly because the value field is shared across all operators; a
 * spread alone would widen the union and lose the discriminant.
 */
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

function onConditionKindChange(index: number, condition: LabRuleConditionV1, kind: LabRuleConditionV1['kind']) {
  if (kind === 'payload_exists') {
    updateCondition(index, {
      kind,
      path:
        condition.kind === 'payload_exists' || condition.kind === 'payload_equals'
          ? condition.path
          : 'id',
    });
    return;
  }
  if (kind === 'payload_equals') {
    const path =
      condition.kind === 'payload_exists' || condition.kind === 'payload_equals' ? condition.path : 'id';
    updateCondition(index, { kind, path, value: '' });
    return;
  }
  if (kind === 'lookup_field_exists' || kind === 'lookup_field_equals') {
    const recordIdPath =
      buildRuleConditionPayloadPathOptions('', payloadFieldDescriptors.value).find(
        (o) => o.value !== '__path_custom__',
      )?.value ?? 'id';
    updateCondition(
      index,
      defaultLookupRuleCondition(kind, props.integrationServiceCatalog, recordIdPath),
    );
  }
}

/**
 * Persist a new field selection, keeping the operator and value.
 *
 * ## The bug this fixes
 *
 * This used to `return` early for any operator that was not `payload_exists` / `payload_equals` —
 * a leftover from when those were the only two kinds. Once `payload_less_or_equal` and friends
 * existed, choosing a field on one of them silently did nothing: the select re-rendered from the old
 * condition on the next tick and the field appeared to snap back to its previous value. It looked
 * like the save was reverting, but the change never left the component.
 *
 * The path is the author's choice and always wins. Only the *value* is adjusted, and only where the
 * new field's type demands it (a fixed pick list, or a user select). Operators that carry no value
 * (`exists` / `missing`) take the path alone.
 */
function onConditionPathChange(index: number, condition: LabRuleConditionV1, path: string): void {
  if (!isPayloadCondition(condition)) {
    // A connector lookup has no payload path; the lookup panel owns its own record/field inputs.
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

function conditionKindPt(index: number) {
  return withFormControlRootId(formSelectPt, generateUniqueId(`${props.fieldKeyPrefix}-cond-kind-${index}`));
}

function conditionPathPt(index: number) {
  return withFormControlRootId(formSelectPt, generateUniqueId(`${props.fieldKeyPrefix}-cond-path-${index}`));
}

function conditionPathCustomPt(index: number) {
  return withFormControlRootId(
    formInputTextPt,
    generateUniqueId(`${props.fieldKeyPrefix}-cond-path-custom-${index}`),
  );
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="(condition, index) in conditions"
      :key="`${fieldKeyPrefix}-cond-${index}`"
      class="lab-rules-condition-row flex-col! items-stretch! mt-0 gap-2"
    >
      <div class="flex flex-wrap items-center gap-2">
        <!--
          Field first, then operator.

          The operator menu is *derived from* the field's type (a number offers ordering, a boolean
          does not), so asking for the operator first means the author picks from a list that is about
          to change under them. Reading order follows the dependency: choose the thing, then choose
          what to ask of it.
        -->
        <Select
          v-if="
            isPayloadCondition(condition) &&
            ruleConditionPayloadPathUseSelect(payloadPathOptionsFor(condition.path))
          "
          :model-value="condition.path"
          :options="payloadPathOptionsFor(condition.path)"
          option-label="label"
          option-value="value"
          class="min-w-[9rem]"
          :pt="conditionPathPt(index)"
          @update:model-value="(path) => path && onConditionPathChange(index, condition, path)"
        />
        <InputText
          v-else-if="isPayloadCondition(condition)"
          :model-value="condition.path"
          placeholder="Field name from event"
          class="min-w-[9rem] text-sm"
          :pt="conditionPathCustomPt(index)"
          @update:model-value="(path) => onConditionPathChange(index, condition, path ?? '')"
        />
        <!--
          Operator list depends on the field, so this select is split in two cases: a payload operator
          offers the type-appropriate set, and the connector-lookup operators stay available for the
          records this workflow can fetch.
        -->
        <Select
          v-if="isPayloadCondition(condition)"
          :model-value="condition.kind"
          :options="operatorOptionsFor(condition.path)"
          option-label="label"
          option-value="value"
          class="min-w-[10rem]"
          :pt="conditionKindPt(index)"
          @update:model-value="
            (kind: LabRuleConditionV1['kind']) =>
              onConditionOperatorChange(index, condition, kind)
          "
        />
        <Select
          v-else
          :model-value="condition.kind"
          :options="LOOKUP_OPERATOR_OPTIONS"
          option-label="label"
          option-value="value"
          class="min-w-[10rem]"
          :pt="conditionKindPt(index)"
          @update:model-value="
            (kind: LabRuleConditionV1['kind']) => onConditionKindChange(index, condition, kind)
          "
        />
        <LabRuleConditionValueField
          v-if="isPayloadCondition(condition) && conditionNeedsValue(condition)"
          :field-index="index"
          :value-kind="payloadValueKind(condition.path)"
          :enum-options="payloadValueOptionsFor(condition.path)"
          :model-value="payloadConditionValue(condition)"
          :lab-user-options="labUserOptions"
          @update:model-value="(v) => onConditionValueChange(index, condition, v)"
        />
        <Button
          icon="pi pi-trash"
          severity="danger"
          text
          :pt="{ root: { attrs: { id: generateUniqueId(`${fieldKeyPrefix}-cond-rm-${index}`) } } }"
          @click="removeCondition(index)"
        />
      </div>
      <LabIntegrationLookupConditionFields
        v-if="condition.kind === 'lookup_field_exists' || condition.kind === 'lookup_field_equals'"
        :condition="condition"
        :field-key="`${fieldKeyPrefix}-${index}`"
        :integration-service-catalog="integrationServiceCatalog"
        :payload-path-options="payloadPathOptionsFor(condition.recordIdPath)"
        :lab-user-options="labUserOptions"
        @update:condition="(next) => updateCondition(index, next)"
      />
    </div>
    <Button
      label="Add condition"
      icon="pi pi-plus"
      size="small"
      :pt="{ root: { attrs: { id: generateUniqueId(`${fieldKeyPrefix}-cond-add`) } } }"
      @click="addCondition"
    />
    <Select
      v-if="showCombine"
      :model-value="combine ?? 'all'"
      :options="combineOptions"
      option-label="label"
      option-value="value"
      class="w-full"
      :pt="withFormControlRootId(formSelectPt, generateUniqueId(`${fieldKeyPrefix}-combine`))"
      @update:model-value="(value) => value && emit('update:combine', value)"
    />
  </div>
</template>
