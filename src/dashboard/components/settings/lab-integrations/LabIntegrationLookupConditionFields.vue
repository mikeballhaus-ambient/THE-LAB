<script setup lang="ts">
import { computed, ref } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import type { LabRuleConditionV1 } from '@/shared/types/lab-rule';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import { listIntegrationWriteServices } from '@/shared/utils/lab-integration-write-services';
import { fetchIntegrationConnectorRecord } from '@/shared/services/platform-lab-integrations.client';
import LabRuleConditionValueField from '../lab-rules/LabRuleConditionValueField.vue';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formInputTextPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import { ruleConditionPayloadPathUseSelect } from '@/shared/utils/lab-rule-payload-fields';

const props = defineProps<{
  condition: Extract<LabRuleConditionV1, { kind: 'lookup_field_exists' | 'lookup_field_equals' }>;
  fieldKey: string;
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
  payloadPathOptions: { label: string; value: string }[];
  labUserOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  'update:condition': [value: Extract<LabRuleConditionV1, { kind: 'lookup_field_exists' | 'lookup_field_equals' }>];
}>();

const { generateUniqueId } = useUniqueElementId();

const connectorServices = computed(() => listIntegrationWriteServices(props.integrationServiceCatalog));

const integrationServiceOptions = computed(() =>
  connectorServices.value.map((service) => ({
    label: `${service.appName} · ${service.label}`,
    value: `${service.providerAppId}::${service.serviceId}`,
  })),
);

function integrationServiceKey(providerAppId: string, serviceId: string): string {
  return `${providerAppId}::${serviceId}`;
}

function lookupFieldOptions() {
  const service = connectorServices.value.find(
    (s) =>
      s.providerAppId === props.condition.providerAppId && s.serviceId === props.condition.serviceId,
  );
  return (service?.properties ?? []).map((field) => ({
    label: field.label || field.name,
    value: field.name,
  }));
}

type LookupCondition = Extract<
  LabRuleConditionV1,
  { kind: 'lookup_field_exists' | 'lookup_field_equals' }
>;

function patch(partial: Partial<LookupCondition>): void {
  emit('update:condition', { ...props.condition, ...partial } as LookupCondition);
}

function onServiceChange(key: string): void {
  const [providerAppId, serviceId] = key.split('::');
  if (!providerAppId || !serviceId) {
    return;
  }
  const service = connectorServices.value.find(
    (s) => s.providerAppId === providerAppId && s.serviceId === serviceId,
  );
  const field = service?.properties[0]?.name ?? props.condition.field;
  patch({ providerAppId, serviceId, field });
}

const sampleRecordId = ref('');
const previewLoading = ref(false);
const previewError = ref('');
const previewFieldValue = ref<string | null>(null);

async function previewLiveLookup(): Promise<void> {
  previewError.value = '';
  previewFieldValue.value = null;
  const id = sampleRecordId.value.trim();
  if (!id) {
    previewError.value = 'Enter a record id to preview.';
    return;
  }
  previewLoading.value = true;
  try {
    const record = await fetchIntegrationConnectorRecord(
      props.condition.providerAppId,
      props.condition.serviceId,
      id,
    );
    if (!record) {
      previewError.value = 'Record not found (404).';
      return;
    }
    const raw = record[props.condition.field];
    previewFieldValue.value =
      raw === undefined || raw === null ? '(empty)' : typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
  } catch (err) {
    previewError.value = err instanceof Error ? err.message : 'Lookup failed';
  } finally {
    previewLoading.value = false;
  }
}

function servicePt(suffix: string) {
  return withFormControlRootId(formSelectPt, generateUniqueId(`lookup-cond-svc-${props.fieldKey}-${suffix}`));
}
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <div class="flex w-full flex-col gap-1">
      <span class="text-xs font-medium text-lab-general-text-muted">Related record</span>
      <Select
        :model-value="integrationServiceKey(condition.providerAppId, condition.serviceId)"
        :options="integrationServiceOptions"
        option-label="label"
        option-value="value"
        placeholder="Choose app and record type"
        class="w-full"
        :pt="servicePt('pick')"
        @update:model-value="(key) => key && onServiceChange(key)"
      />
    </div>

    <div class="lab-workflow-integration-field-map lab-workflow-integration-field-map--lookup w-full">
      <div class="lab-workflow-integration-field-map__header">
        <span>From event</span>
        <span>On related record</span>
      </div>
      <div class="lab-workflow-integration-field-map__row">
        <Select
          v-if="ruleConditionPayloadPathUseSelect(payloadPathOptions)"
          :model-value="condition.recordIdPath"
          :options="payloadPathOptions"
          option-label="label"
          option-value="value"
          placeholder="Event field with record id"
          class="min-w-0 w-full"
          :pt="servicePt('id-path')"
          @update:model-value="(path) => path && patch({ recordIdPath: path })"
        />
        <InputText
          v-else
          :model-value="condition.recordIdPath"
          placeholder="Event field with record id"
          class="min-w-0 w-full text-sm"
          :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`lookup-cond-id-${fieldKey}`))"
          @update:model-value="(path) => patch({ recordIdPath: path ?? '' })"
        />
        <div class="flex min-w-0 w-full flex-col gap-2">
          <Select
            :model-value="condition.field"
            :options="lookupFieldOptions()"
            option-label="label"
            option-value="value"
            placeholder="Field to read"
            class="w-full"
            :pt="servicePt('field')"
            @update:model-value="(field) => field && patch({ field })"
          />
          <LabRuleConditionValueField
            v-if="condition.kind === 'lookup_field_equals'"
            :field-index="0"
            value-kind="string"
            :model-value="condition.value ?? undefined"
            :lab-user-options="labUserOptions"
            @update:model-value="(v) => condition.kind === 'lookup_field_equals' && patch({ value: v })"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-t border-lab-general-border pt-2">
      <span class="text-xs text-lab-general-text-muted">Try with an example id</span>
      <InputText
        v-model="sampleRecordId"
        placeholder="Example record id"
        class="min-w-[8rem] font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`lookup-preview-id-${fieldKey}`))"
      />
      <Button
        label="Fetch record"
        icon="pi pi-search"
        size="small"
        outlined
        :loading="previewLoading"
        :pt="{ root: { attrs: { id: generateUniqueId(`lookup-preview-btn-${fieldKey}`) } } }"
        @click="previewLiveLookup"
      />
      <Message
        v-if="previewError"
        severity="warn"
        :closable="false"
        class="m-0 text-xs"
        :pt="{ root: { attrs: { id: generateUniqueId(`lookup-preview-err-${fieldKey}`) } } }"
      >
        {{ previewError }}
      </Message>
      <span v-else-if="previewFieldValue != null" class="text-xs text-lab-general-text">
        Current value: {{ previewFieldValue }}
      </span>
    </div>
  </div>
</template>
