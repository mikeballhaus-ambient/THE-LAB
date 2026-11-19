<script setup lang="ts">
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import type { LabWorkflowStepV1 } from '@/shared/types/lab-workflow';
import type { LabDomainEventCatalogEntry } from '@/shared/types/lab-domain-event-catalog';
import type { LabIntegrationServiceCatalogResponse } from '@/shared/types/lab-integration-service-catalog';
import type { LabIntegrationWriteServiceRef } from '@/shared/utils/lab-integration-write-services';
import type { FormBuilderContractModelProperty } from '@/shared/types/forms-builder-integration';
import { computed } from 'vue';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { formInputTextPt, formMultiSelectPt, formSelectPt, withFormControlRootId } from '@/shared/forms/form-control-pt';
import LabWorkflowPayloadConditionFields from './LabWorkflowPayloadConditionFields.vue';
import LabWorkflowSetFieldsEditor from './LabWorkflowSetFieldsEditor.vue';
import LabWorkflowCodeNodeEditor from './LabWorkflowCodeNodeEditor.vue';
import LabWorkflowPayloadTemplateInput from './LabWorkflowPayloadTemplateInput.vue';
import type { CapturedPayloadField } from '@/shared/utils/lab-workflow-captured-payload-fields';
import {
  defaultAutomaticBodyFromPayload,
  integrationPropertyForField,
  isWorkflowMapperHiddenField,
  integrationPropertiesForWorkflowDesigner,
  splitIntegrationBodyFromPayloadMappings,
  userMappableIntegrationProperties,
} from '@/shared/utils/lab-workflow-integration-field-mapping';
import {
  LAB_WORKFLOW_TOAST_ITEM_INSERT_OPTIONS,
  mergeCapturedPayloadFieldHints,
  LAB_WORKFLOW_QUARKS_ITEM_FIELD_HINTS,
} from '@/shared/utils/lab-workflow-quarks-item-fields';
import { CUSTOM_PATH_SENTINEL } from '@/shared/utils/lab-workflow-captured-payload-fields';

const props = defineProps<{
  step: LabWorkflowStepV1;
  ruleOptions: { label: string; value: string }[];
  userOptions: { label: string; value: number }[];
  payloadPathOptions: { label: string; value: string }[];
  /**
   * Fields from the most recent captured payload.
   *
   * Separate from `payloadPathOptions` because that list carries UI sentinels (`__path_custom__`) and
   * pre-formatted labels meant for a select. Completion needs bare dotted paths and their types, and
   * inserting a sentinel into code would produce a reference that can never resolve.
   */
  capturedPayloadFields?: CapturedPayloadField[];
  integrationWriteServices?: LabIntegrationWriteServiceRef[];
  rulesLoading?: boolean;
  blockKey: string;
  triggerEventType?: string;
  catalogEntries?: LabDomainEventCatalogEntry[];
  integrationServiceCatalog?: LabIntegrationServiceCatalogResponse | null;
}>();

const emit = defineEmits<{
  'update:step': [step: LabWorkflowStepV1];
}>();

const { generateUniqueId } = useUniqueElementId();

const labUserOptionsForConditions = computed(() =>
  props.userOptions.map((user) => ({ label: user.label, value: String(user.value) })),
);

const activeIntegrationService = computed(() => {
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return null;
  }
  return props.integrationWriteServices?.find(
    (row) => row.providerAppId === step.providerAppId && row.serviceId === step.serviceId,
  );
});

const designerIntegrationProperties = computed(() => {
  const service = activeIntegrationService.value;
  if (!service) {
    return [];
  }
  return integrationPropertiesForWorkflowDesigner(service.serviceId, service.properties ?? []);
});

const integrationBodyFieldOptions = computed(() => {
  const propsList = designerIntegrationProperties.value;
  if (propsList.length) {
    return userMappableIntegrationProperties(propsList).map((field) => ({
      label: field.label?.trim() || field.name,
      value: field.name,
    }));
  }
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return [];
  }
  return Object.entries(step.bodyFromPayload ?? {})
    .filter(([field]) => !isWorkflowMapperHiddenField(integrationPropertyForField([], field)))
    .map(([key]) => ({ label: key, value: key }));
});

function patchIntegrationBodyFromPayload(next: Record<string, string>): void {
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return;
  }
  emit('update:step', { ...step, bodyFromPayload: next });
}

function onIntegrationBodyFieldChange(previousField: string, nextField: string): void {
  const step = props.step;
  if ((step.kind !== 'integration_create' && step.kind !== 'integration_update') || !nextField.trim()) {
    return;
  }
  const body = { ...(step.bodyFromPayload ?? {}) };
  const sourcePath = body[previousField] ?? 'payload.title';
  delete body[previousField];
  body[nextField.trim()] = sourcePath;
  patchIntegrationBodyFromPayload(body);
}

function onIntegrationBodySourceChange(field: string, sourcePath: string): void {
  const step = props.step;
  if ((step.kind !== 'integration_create' && step.kind !== 'integration_update') || !sourcePath) {
    return;
  }
  patchIntegrationBodyFromPayload({
    ...(step.bodyFromPayload ?? {}),
    [field]: sourcePath,
  });
}

function labelForAdHocPayloadPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return 'Custom path';
  }
  return trimmed
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const quarksItemFieldHints = computed(() =>
  mergeCapturedPayloadFieldHints(
    props.capturedPayloadFields ?? [],
    LAB_WORKFLOW_QUARKS_ITEM_FIELD_HINTS,
  ),
);

/** Paths on the current workflow item row (user id, Quarks fields, captured trigger fields). */
const workflowItemPathOptions = computed(() => {
  const byValue = new Map<string, { label: string; value: string }>();
  for (const field of quarksItemFieldHints.value) {
    byValue.set(field.path, {
      label: field.type === 'string' ? field.path : `${field.path} (${field.type})`,
      value: field.path,
    });
  }
  for (const option of props.payloadPathOptions) {
    if (option.value === CUSTOM_PATH_SENTINEL || !option.value.trim()) {
      continue;
    }
    if (!byValue.has(option.value)) {
      byValue.set(option.value, option);
    }
  }
  const list = [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
  if (!list.some((option) => option.value === CUSTOM_PATH_SENTINEL)) {
    list.push({ label: 'Custom path…', value: CUSTOM_PATH_SENTINEL });
  }
  return list;
});

const TOAST_SEVERITY_OPTIONS: { label: string; value: 'success' | 'info' | 'warn' | 'error' }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warn' },
  { label: 'Error', value: 'error' },
];

const TOAST_SUMMARY_PLACEHOLDER = 'Title — e.g. Daily allotment';
const TOAST_DETAIL_PLACEHOLDER = 'Detail — e.g. +{{accrualDelta}} Quarks ({{balanceAfter}} total)';

function isQuarksUserIdStep(
  step: LabWorkflowStepV1,
): step is Extract<
  LabWorkflowStepV1,
  | { kind: 'virtual_bank_get_wallet' }
  | { kind: 'virtual_bank_credit_daily_allotment' }
  | { kind: 'show_user_toast' }
> {
  return (
    step.kind === 'virtual_bank_get_wallet' ||
    step.kind === 'virtual_bank_credit_daily_allotment' ||
    step.kind === 'show_user_toast'
  );
}

function onQuarksUserIdPathUpdate(path: string | undefined): void {
  const step = props.step;
  if (!isQuarksUserIdStep(step)) {
    return;
  }
  const trimmed = path?.trim();
  const userIdPath =
    trimmed && trimmed !== CUSTOM_PATH_SENTINEL ? trimmed : step.userIdPath?.trim() || 'userId';
  emit('update:step', { ...step, userIdPath });
}

function onShowUserToastSeverityChange(
  severity: 'success' | 'info' | 'warn' | 'error' | null | undefined,
): void {
  const step = props.step;
  if (step.kind !== 'show_user_toast' || !severity) {
    return;
  }
  emit('update:step', { ...step, severity });
}

function onShowUserToastFieldUpdate(field: 'summary' | 'detail', value: string): void {
  const step = props.step;
  if (step.kind !== 'show_user_toast') {
    return;
  }
  if (field === 'summary') {
    emit('update:step', { ...step, summary: value });
    return;
  }
  emit('update:step', { ...step, detail: value.trim() ? value : undefined });
}

const integrationPayloadPathOptions = computed(() => {
  const byValue = new Map(props.payloadPathOptions.map((option) => [option.value, option]));
  for (const field of props.capturedPayloadFields ?? []) {
    const normalized = field.path.trim();
    if (!normalized || byValue.has(normalized)) {
      continue;
    }
    const label =
      field.type === 'string' ? normalized : `${normalized} (${field.type})`;
    byValue.set(normalized, { label, value: normalized });
  }
  const step = props.step;
  if (
    step.kind === 'integration_create' ||
    step.kind === 'integration_update' ||
    step.kind === 'http_request'
  ) {
    for (const sourcePath of Object.values(step.bodyFromPayload ?? {})) {
      const normalized = sourcePath.replace(/^payload\./, '').trim();
      if (!normalized || byValue.has(normalized)) {
        continue;
      }
      byValue.set(normalized, { label: labelForAdHocPayloadPath(normalized), value: normalized });
    }
  }
  const list = [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
  if (!list.some((option) => option.value === '__path_custom__')) {
    list.push({ label: 'Custom path…', value: '__path_custom__' });
  }
  return list;
});

const integrationMappingViews = computed(() => {
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return { userMappings: [], automaticMappings: [] };
  }
  const labelByKey = new Map<string, string>();
  for (const option of props.payloadPathOptions) {
    labelByKey.set(option.value, option.label);
  }
  for (const option of integrationPayloadPathOptions.value) {
    labelByKey.set(option.value, option.label);
  }
  const properties = designerIntegrationProperties.value;
  return splitIntegrationBodyFromPayloadMappings(
    properties,
    step.bodyFromPayload ?? {},
    labelByKey,
  );
});

function payloadPathSelectValue(
  sourcePath: string,
  options: { label: string; value: string }[],
): string {
  const normalized = sourcePath.replace(/^payload\./, '').trim();
  const match = options.find((option) => option.value === normalized);
  return match?.value ?? (normalized ? normalized : '__path_custom__');
}

function mergeBodyFromPayloadForServiceChange(
  properties: FormBuilderContractModelProperty[],
  previous: Record<string, string> | undefined,
): Record<string, string> {
  const automatic = defaultAutomaticBodyFromPayload(properties);
  const user: Record<string, string> = {};
  for (const [field, path] of Object.entries(previous ?? {})) {
    const property = integrationPropertyForField(properties, field);
    if (!isWorkflowMapperHiddenField(property)) {
      user[field] = path;
    }
  }
  return { ...automatic, ...user };
}

function addIntegrationBodyMappingRow(): void {
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return;
  }
  const field =
    integrationBodyFieldOptions.value.find(
      (option) => !(step.bodyFromPayload && option.value in step.bodyFromPayload),
    )?.value ?? 'title';
  const path =
    props.payloadPathOptions.find((option) => option.value !== '__path_custom__')?.value ?? 'title';
  patchIntegrationBodyFromPayload({
    ...(step.bodyFromPayload ?? {}),
    [field]: `payload.${path}`,
  });
}

function removeIntegrationBodyMappingRow(field: string): void {
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return;
  }
  const property = integrationPropertyForField(designerIntegrationProperties.value, field);
  if (isWorkflowMapperHiddenField(property)) {
    return;
  }
  const next = { ...(step.bodyFromPayload ?? {}) };
  delete next[field];
  patchIntegrationBodyFromPayload(next);
}

function patchHttpBodyFromPayload(next: Record<string, string>): void {
  const step = props.step;
  if (step.kind !== 'http_request') {
    return;
  }
  const cleaned = Object.fromEntries(
    Object.entries(next).filter(([field]) => field.trim().length > 0),
  );
  emit('update:step', {
    ...step,
    bodyFromPayload: Object.keys(cleaned).length ? cleaned : undefined,
  });
}

const httpBodyMappings = computed(() => {
  const step = props.step;
  if (step.kind !== 'http_request') {
    return [];
  }
  const labelByKey = new Map(props.payloadPathOptions.map((option) => [option.value, option.label]));
  for (const option of integrationPayloadPathOptions.value) {
    labelByKey.set(option.value, option.label);
  }
  return Object.entries(step.bodyFromPayload ?? {}).map(([field, sourcePath]) => ({
    field,
    sourcePath,
    fieldLabel: field,
    sourceLabel:
      labelByKey.get(sourcePath.replace(/^payload\./, '').trim()) ??
      labelForAdHocPayloadPath(sourcePath.replace(/^payload\./, '')),
  }));
});

function onHttpBodyFieldChange(previousField: string, nextField: string): void {
  const step = props.step;
  if (step.kind !== 'http_request' || !nextField.trim()) {
    return;
  }
  const body = { ...(step.bodyFromPayload ?? {}) };
  const sourcePath = body[previousField] ?? 'payload.title';
  delete body[previousField];
  body[nextField.trim()] = sourcePath;
  patchHttpBodyFromPayload(body);
}

function onHttpBodySourceChange(field: string, sourcePath: string): void {
  const step = props.step;
  if (step.kind !== 'http_request' || !sourcePath) {
    return;
  }
  patchHttpBodyFromPayload({
    ...(step.bodyFromPayload ?? {}),
    [field]: sourcePath,
  });
}

function addHttpBodyMappingRow(): void {
  const step = props.step;
  if (step.kind !== 'http_request') {
    return;
  }
  const field = `field${Object.keys(step.bodyFromPayload ?? {}).length + 1}`;
  const path =
    props.payloadPathOptions.find((option) => option.value !== '__path_custom__')?.value ?? 'title';
  patchHttpBodyFromPayload({
    ...(step.bodyFromPayload ?? {}),
    [field]: `payload.${path}`,
  });
}

function removeHttpBodyMappingRow(field: string): void {
  const step = props.step;
  if (step.kind !== 'http_request') {
    return;
  }
  const next = { ...(step.bodyFromPayload ?? {}) };
  delete next[field];
  patchHttpBodyFromPayload(next);
}

const HTTP_METHOD_OPTIONS: {
  label: string;
  value: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}[] = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

function onHttpMethodChange(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | null | undefined): void {
  const step = props.step;
  if (step.kind !== 'http_request' || !method) {
    return;
  }
  emit('update:step', { ...step, method });
}

function onHttpUrlChange(url: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'http_request') {
    return;
  }
  emit('update:step', { ...step, url: url ?? '' });
}

function onHttpAllowListChange(raw: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'http_request') {
    return;
  }
  const hosts = (raw ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
  emit('update:step', {
    ...step,
    allowList: hosts.length ? hosts : undefined,
  });
}

const httpAllowListDisplay = computed(() => {
  const step = props.step;
  if (step.kind !== 'http_request') {
    return '';
  }
  return (step.allowList ?? []).join(', ');
});

const integrationStepSummary = computed(() => {
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return '';
  }
  const match = props.integrationWriteServices?.find(
    (row) => row.providerAppId === step.providerAppId && row.serviceId === step.serviceId,
  );
  if (match) {
    return `${match.appName} · ${match.label}`;
  }
  return 'Update app record';
});

/**
 * These narrow inside the function rather than in the template.
 *
 * Vue's template type-narrowing does not survive into an inline arrow handler, so `step.message`
 * there widens back to the full step union and fails to compile.
 */
/**
 * Which identity a `notify_users` node uses.
 *
 * Derived from the step rather than kept in local state: the graph is the source of truth, and a
 * local copy would drift the moment the node was edited from somewhere else (an undo, an import, a
 * second panel open on the same workflow).
 */
type NotifyRecipientSource = 'users' | 'payload';

const NOTIFY_RECIPIENT_SOURCE_OPTIONS: { label: string; value: NotifyRecipientSource }[] = [
  { label: 'Lab users', value: 'users' },
  { label: 'From payload', value: 'payload' },
];

const notifyRecipientSource = computed((): NotifyRecipientSource => {
  const step = props.step;
  if (step.kind !== 'notify_users') {
    return 'users';
  }
  return step.path?.trim() ? 'payload' : 'users';
});

const notifyFixedUserIds = computed((): number[] => {
  const step = props.step;
  return step.kind === 'notify_users' ? step.userIds : [];
});

/** Ids saved on the step that are not in the designer user list (e.g. stale seed user). */
const notifyUserIdsMissingFromPicker = computed((): number[] => {
  if (props.step.kind !== 'notify_users') {
    return [];
  }
  const known = new Set(props.userOptions.map((row) => row.value));
  return props.step.userIds.filter((id) => !known.has(id));
});

/**
 * Switch recipient source, **clearing the other one**.
 *
 * Both fields can technically coexist — the runner unions them — but a designer toggle that left the
 * previous selection in place would make "I switched to payload and it still went to Mia" a mystery
 * inside the panel. Coexisting values remain valid in saved graphs and are still honoured at run
 * time; the panel just never produces one.
 */
function onNotifyRecipientSourceChange(source: NotifyRecipientSource): void {
  const step = props.step;
  if (step.kind !== 'notify_users' || notifyRecipientSource.value === source) {
    return;
  }
  if (source === 'payload') {
    emit('update:step', {
      kind: 'notify_users',
      userIds: [],
      path: step.path?.trim() || 'userId',
      message: step.message,
    });
    return;
  }
  const firstUser = props.userOptions[0]?.value;
  emit('update:step', {
    kind: 'notify_users',
    userIds: step.userIds.length ? step.userIds : firstUser != null ? [firstUser] : [],
    message: step.message,
  });
}

function onNotifyUsersMultiChange(userIds: number[] | null | undefined): void {
  const step = props.step;
  if (step.kind !== 'notify_users') {
    return;
  }
  const next = (userIds ?? []).filter((id) => Number.isFinite(id));
  emit('update:step', { kind: 'notify_users', userIds: next, message: step.message });
}

function onNotifyUsersPathChange(path: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'notify_users') {
    return;
  }
  const trimmed = path?.trim();
  emit('update:step', {
    kind: 'notify_users',
    userIds: step.userIds,
    ...(trimmed ? { path: trimmed } : {}),
    message: step.message,
  });
}

function onCommsPathUpdate(path: string): void {
  const step = props.step;
  if (step.kind !== 'comms_system_dm_payload_user') {
    return;
  }
  emit('update:step', { kind: 'comms_system_dm_payload_user', path, text: step.text });
}

function onIntegrationServiceKeyChange(key: string): void {
  const step = props.step;
  if (step.kind !== 'integration_create' && step.kind !== 'integration_update') {
    return;
  }
  const [providerAppId, serviceId] = key.split('::');
  if (!providerAppId || !serviceId) {
    return;
  }
  const service = props.integrationWriteServices?.find(
    (row) => row.providerAppId === providerAppId && row.serviceId === serviceId,
  );
  const bodyFromPayload = mergeBodyFromPayloadForServiceChange(
    integrationPropertiesForWorkflowDesigner(serviceId, service?.properties ?? []),
    step.bodyFromPayload,
  );
  if (step.kind === 'integration_create') {
    emit('update:step', {
      kind: 'integration_create',
      providerAppId,
      serviceId,
      body: step.body,
      bodyFromPayload,
    });
    return;
  }
  emit('update:step', {
    kind: 'integration_update',
    providerAppId,
    serviceId,
    recordIdPath: step.recordIdPath,
    bodyFromPayload,
  });
}

function onIntegrationRecordIdPathUpdate(path: string): void {
  const step = props.step;
  if (step.kind !== 'integration_update') {
    return;
  }
  emit('update:step', {
    kind: 'integration_update',
    providerAppId: step.providerAppId,
    serviceId: step.serviceId,
    recordIdPath: path,
    bodyFromPayload: step.bodyFromPayload,
  });
}

const MESSAGE_TITLE_PLACEHOLDER = 'Title — e.g. New task: {{payload.title}}';
const MESSAGE_BODY_PLACEHOLDER = 'Body — e.g. {{payload.title}} was assigned to you';

/**
 * Update one field of a notification step's copy override.
 *
 * An emptied field is **removed** rather than stored as `''`. An empty string is truthy-adjacent in
 * the runner's "did the author supply copy?" check, so it would suppress the built-in wording while
 * rendering nothing — a notification with a blank title, which reads as a bug in the app.
 */
function onMessageFieldUpdate(step: LabWorkflowStepV1, field: 'title' | 'body', value: string): void {
  if (step.kind !== 'notify_users') {
    return;
  }
  const message = { ...(step.message ?? {}) };
  if (value.trim()) {
    message[field] = value;
  } else {
    delete message[field];
  }
  const hasAny = Boolean(message.title?.trim() || message.body?.trim());
  emit('update:step', { ...step, message: hasAny ? message : undefined });
}

function onPublishEventTypeUpdate(type: string): void {
  const step = props.step;
  if (step.kind !== 'publish_event') {
    return;
  }
  emit('update:step', {
    kind: 'publish_event',
    type,
    sourceAppId: step.sourceAppId,
    payloadMerge: step.payloadMerge,
  });
}

function onPublishSourceAppIdUpdate(sourceAppId: string): void {
  const step = props.step;
  if (step.kind !== 'publish_event') {
    return;
  }
  emit('update:step', {
    kind: 'publish_event',
    type: step.type,
    sourceAppId,
    payloadMerge: step.payloadMerge,
  });
}

// -------------------------------------------------------------------------------------------
// Data nodes (A2–A6).
//
// Edited as JSON text rather than as a bespoke row editor. The reason is scope, not preference: the
// values are structured (a list of assignments, a list of operations) and a row editor for each is
// five more components. The JSON is validated by the same Zod schema the server uses, so an invalid
// edit is rejected at save with a message naming the step — it cannot reach a stored workflow.
// -------------------------------------------------------------------------------------------

const RENAME_FIELDS_PLACEHOLDER = '{"renames":[{"from":"qty","to":"quantity"}],"remove":["tmp"]}';
const DATE_TIME_PLACEHOLDER =
  '[{"source":"createdAt","op":"add","amount":1,"unit":"days","zone":"America/Denver"}]';
const FILTER_PLACEHOLDER = '[{"kind":"payload_equals","path":"status","value":"open"}]';
const SORT_PLACEHOLDER = '{"sort":[{"path":"createdAt","direction":"desc"}],"limit":10}';

/**
 * Parse an edited JSON field and emit the new step, or keep the previous value on a parse error.
 *
 * A silent reset to a default would be worse than a no-op: the user would lose what they typed with
 * no indication. The schema-aware rejection happens at save time, which is where it belongs.
 */
function onJsonFieldUpdate(raw: string | undefined, apply: (parsed: unknown) => void): void {
  if (!raw?.trim()) {
    return;
  }
  try {
    apply(JSON.parse(raw) as unknown);
  } catch {
    // Keep the previous value; the raw text stays visible in the input for correction.
  }
}

/**
 * Clamp the loop cap to what the schema accepts.
 *
 * The schema requires 1–100 and the run refuses an out-of-range value, but clamping as the user types
 * is wrong: typing "10" passes through "1", and an empty box would become 1. So out-of-range input is
 * ignored until it is valid, and only the final value is persisted.
 */
function onLoopMaxIterationsChange(raw: unknown): void {
  const step = props.step;
  if (step.kind !== 'loop') {
    return;
  }
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
    return;
  }
  if (parsed === step.maxIterations) {
    return;
  }
  emit('update:step', {
    kind: 'loop',
    maxIterations: parsed,
    ...(step.while?.length ? { while: step.while } : {}),
  });
}

function jsonText(value: unknown): string {
  return JSON.stringify(value ?? null, null, 0);
}

function onSetFieldsChange(fields: { path: string; source: 'literal' | 'from_payload' | 'template'; value: string | number | boolean | null }[]): void {
  const step = props.step;
  if (step.kind !== 'set_fields') {
    return;
  }
  emit('update:step', { ...step, fields });
}

function onCodeSourceChange(source: string): void {
  const step = props.step;
  if (step.kind !== 'code') {
    return;
  }
  emit('update:step', { ...step, source });
}

function onRenameFieldsJson(raw: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'rename_fields') {
    return;
  }
  onJsonFieldUpdate(raw, (parsed) => {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const value = parsed as { renames?: typeof step.renames; remove?: typeof step.remove };
      emit('update:step', { kind: 'rename_fields', renames: value.renames, remove: value.remove });
    }
  });
}

function onDateTimeJson(raw: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'date_time') {
    return;
  }
  onJsonFieldUpdate(raw, (parsed) => {
    if (Array.isArray(parsed)) {
      emit('update:step', { ...step, operations: parsed as typeof step.operations });
    }
  });
}

function onFilterFieldsJson(raw: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'filter_items') {
    return;
  }
  onJsonFieldUpdate(raw, (parsed) => {
    if (Array.isArray(parsed)) {
      emit('update:step', { ...step, conditions: parsed as typeof step.conditions });
    }
  });
}

function onFilterCombineChange(combine: 'all' | 'any' | null | undefined): void {
  const step = props.step;
  if (step.kind !== 'filter_items' || !combine) {
    return;
  }
  emit('update:step', { ...step, combine });
}

function onSortFieldsJson(raw: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'sort_items') {
    return;
  }
  onJsonFieldUpdate(raw, (parsed) => {
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const value = parsed as {
        sort?: typeof step.sort;
        limit?: typeof step.limit;
        dedupeBy?: typeof step.dedupeBy;
      };
      emit('update:step', {
        kind: 'sort_items',
        sort: value.sort,
        limit: value.limit,
        dedupeBy: value.dedupeBy,
      });
    }
  });
}

// -------------------------------------------------------------------------------------------
// Routing nodes (W7).
// -------------------------------------------------------------------------------------------

const SWITCH_PLACEHOLDER =
  '[{"label":"High","conditions":[{"kind":"payload_equals","path":"priority","value":"high"}]}]';

function onSwitchRoutingsJson(raw: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'switch_condition') {
    return;
  }
  onJsonFieldUpdate(raw, (parsed) => {
    if (Array.isArray(parsed)) {
      emit('update:step', { ...step, routings: parsed as typeof step.routings });
    }
  });
}

function onSplitOutPathUpdate(path: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'split_out' || !path?.trim()) {
    return;
  }
  emit('update:step', { ...step, path });
}

/**
 * Clearing the target path must **remove** the field, not store `''`: an empty string is a path
 * that resolves nowhere, and the runner would write into a key named nothing.
 */
function onSplitOutTargetUpdate(targetPath: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'split_out') {
    return;
  }
  const next = { ...step };
  if (targetPath?.trim()) {
    next.targetPath = targetPath;
  } else {
    delete next.targetPath;
  }
  emit('update:step', next);
}

// -------------------------------------------------------------------------------------------
// Combining nodes (W7b).
// -------------------------------------------------------------------------------------------

const MERGE_MODE_OPTIONS: { label: string; value: 'append' | 'by_index' | 'by_key' }[] = [
  { label: 'Append branches', value: 'append' },
  { label: 'Pair row by row', value: 'by_index' },
  { label: 'Join by key', value: 'by_key' },
];

const MERGE_UNPAIRED_OPTIONS: { label: string; value: boolean }[] = [
  { label: 'Drop rows without a partner', value: false },
  { label: 'Keep rows without a partner', value: true },
];

function onMergeModeChange(mode: 'append' | 'by_index' | 'by_key' | null | undefined): void {
  const step = props.step;
  if (step.kind !== 'merge_items' || !mode) {
    return;
  }
  const next = { ...step, mode };
  // Leaving `by_key` clears the key so a stale path cannot silently justify a later mode switch.
  if (mode !== 'by_key') {
    delete next.keyPath;
  }
  emit('update:step', next);
}

/** Same reasoning as the split-out target: an empty key path must be absent, not `''`. */
function onMergeKeyPathUpdate(keyPath: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'merge_items') {
    return;
  }
  const next = { ...step };
  if (keyPath?.trim()) {
    next.keyPath = keyPath;
  } else {
    delete next.keyPath;
  }
  emit('update:step', next);
}

function onMergeIncludeUnpairedChange(includeUnpaired: boolean | null | undefined): void {
  const step = props.step;
  if (step.kind !== 'merge_items') {
    return;
  }
  const next = { ...step };
  if (includeUnpaired === true) {
    next.includeUnpaired = true;
  } else {
    delete next.includeUnpaired;
  }
  emit('update:step', next);
}

// -------------------------------------------------------------------------------------------
// Pacing (W8b).
// -------------------------------------------------------------------------------------------

type WaitUnit = 'seconds' | 'minutes' | 'hours' | 'days';

/**
 * Seconds is listed explicitly, rather than left as an empty select.
 *
 * `seconds` is the unit a wait already uses when none was chosen, but an empty box reads as "not
 * set yet" — the author cannot tell whether the number beside it is seconds or something the UI
 * failed to load. Naming it costs one option and removes the guess.
 */
const WAIT_UNIT_OPTIONS: { label: string; value: WaitUnit }[] = [
  { label: 'Seconds', value: 'seconds' },
  { label: 'Minutes', value: 'minutes' },
  { label: 'Hours', value: 'hours' },
  { label: 'Days', value: 'days' },
];

/**
 * Cap per unit, mirroring the schema.
 *
 * Seconds are consumed in-process and tolerate a longer bound (300); minutes and above suspend the
 * run on the clock and are capped at 30. Keeping the two in step here means an accepted value is
 * never one the save then rejects.
 */
function waitMaxAmount(unit: WaitUnit): number {
  return unit === 'seconds' ? 300 : 30;
}

function onWaitAmountChange(raw: string | undefined): void {
  const step = props.step;
  if (step.kind !== 'wait') {
    return;
  }
  const amount = Number(raw);
  // A non-numeric or out-of-range value keeps the previous amount rather than writing `NaN`, which
  // would fail the schema and block the whole graph from saving.
  if (!Number.isInteger(amount) || amount < 1 || amount > waitMaxAmount(step.unit)) {
    return;
  }
  emit('update:step', { ...step, amount });
}

function onWaitUnitChange(unit: WaitUnit | null | undefined): void {
  const step = props.step;
  if (step.kind !== 'wait' || !unit) {
    return;
  }
  // Shrinking the bound (300 s → 30 min) can leave an amount the new unit rejects, so clamp rather
  // than emit a step that fails validation on save.
  const amount = Math.min(step.amount, waitMaxAmount(unit));
  emit('update:step', { ...step, unit, amount });
}
</script>

<template>
  <div
    class="lab-workflow-flow-step-editor flex flex-wrap gap-2"
    :class="
      blockKey === 'graph-action'
        ? 'mt-1'
        : 'mt-2 border-t border-lab-general-border pt-2'
    "
  >
    <Select
      v-if="step.kind === 'rule_ref'"
      :model-value="step.ruleId"
      :options="ruleOptions"
      option-label="label"
      option-value="value"
      filter
      :loading="rulesLoading"
      placeholder="Select rule"
      class="min-w-[12rem] flex-1"
      :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-rule-${blockKey}`))"
      @update:model-value="(ruleId) => ruleId && emit('update:step', { kind: 'rule_ref', ruleId })"
    />
    <template v-if="step.kind === 'notify_users'">
      <label
        v-if="blockKey === 'graph-action'"
        class="lab-workflow-flow-step-editor__field-label"
      >
        Who gets the notification
      </label>
      <!--
        Source toggle. Two recipient "kinds" exist because the useful sources disagree on identity:
        a task event carries an id, a connector row or webhook body usually carries an email. Showing
        both controls at once made the node look like it needed both.
      -->
      <SelectButton
        :model-value="notifyRecipientSource"
        :options="NOTIFY_RECIPIENT_SOURCE_OPTIONS"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        :pt="{ root: { attrs: { id: generateUniqueId(`wf-flow-notify-source-${blockKey}`) } } }"
        @update:model-value="(value) => value && onNotifyRecipientSourceChange(value)"
      />
      <MultiSelect
        v-if="notifyRecipientSource === 'users'"
        :model-value="notifyFixedUserIds"
        :options="userOptions"
        option-label="label"
        option-value="value"
        display="chip"
        filter
        :max-selected-labels="4"
        selected-items-label="{0} lab users selected"
        placeholder="Lab users"
        append-to="body"
        class="min-w-[12rem] flex-1"
        :pt="withFormControlRootId(formMultiSelectPt, generateUniqueId(`wf-flow-users-${blockKey}`))"
        @update:model-value="onNotifyUsersMultiChange"
      />
      <p
        v-if="notifyRecipientSource === 'users' && notifyFixedUserIds.length > 0"
        class="m-0 w-full text-xs text-lab-general-text-muted"
      >
        {{ notifyFixedUserIds.length }} recipient{{ notifyFixedUserIds.length === 1 ? '' : 's' }} on this node.
        <span v-if="notifyUserIdsMissingFromPicker.length">
          {{ notifyUserIdsMissingFromPicker.length }} id(s) not in the user list ({{ notifyUserIdsMissingFromPicker.join(', ') }}) — still notified at run time.
        </span>
      </p>
      <Select
        v-else-if="payloadPathOptions.length"
        :model-value="step.path ?? ''"
        :options="payloadPathOptions"
        option-label="label"
        option-value="value"
        placeholder="Event field holding a user id or email"
        class="min-w-[12rem] flex-1"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-notify-path-${blockKey}`))"
        @update:model-value="onNotifyUsersPathChange"
      />
      <InputText
        v-else
        :model-value="step.path ?? ''"
        placeholder="payload.userId or payload.email"
        class="min-w-[12rem] flex-1 font-mono text-sm"
        :pt="
          withFormControlRootId(
            formInputTextPt,
            generateUniqueId(`wf-flow-notify-path-text-${blockKey}`),
          )
        "
        @update:model-value="onNotifyUsersPathChange"
      />
      <p
        v-if="notifyRecipientSource === 'payload'"
        class="m-0 w-full text-xs text-lab-general-text-muted"
      >
        The field may hold a lab user id (number or numeric string) or a user email address.
      </p>
    </template>
    <template v-else-if="step.kind === 'comms_system_dm_payload_user'">
      <label
        v-if="blockKey === 'graph-action'"
        class="lab-workflow-flow-step-editor__field-label"
      >
        Send a Lab Messages direct message to
      </label>
      <Select
        v-if="payloadPathOptions.length"
        :model-value="step.path"
        :options="payloadPathOptions"
        option-label="label"
        option-value="value"
        class="min-w-[12rem] flex-1"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-comms-path-${blockKey}`))"
        @update:model-value="(path) => path && onCommsPathUpdate(path)"
      />
      <InputText
        v-else
        :model-value="step.path"
        placeholder="payload.path"
        class="min-w-[10rem] font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-comms-path-text-${blockKey}`))"
        @update:model-value="(path) => path && onCommsPathUpdate(path)"
      />
    </template>
    <template v-else-if="step.kind === 'integration_create' || step.kind === 'integration_update'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        {{ integrationStepSummary }}
        <span v-if="step.kind === 'integration_update'"> · which record to update comes from the trigger.</span>
      </p>
      <Select
        v-if="integrationWriteServices?.length"
        :model-value="`${step.providerAppId}::${step.serviceId}`"
        :options="
          integrationWriteServices.map((s) => ({
            label: `${s.appName} · ${s.label}`,
            value: `${s.providerAppId}::${s.serviceId}`,
          }))
        "
        option-label="label"
        option-value="value"
        class="min-w-[12rem] flex-1"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-int-svc-${blockKey}`))"
        @update:model-value="(key) => key && onIntegrationServiceKeyChange(key)"
      />
      <Select
        v-if="step.kind === 'integration_update'"
        :model-value="step.recordIdPath"
        :options="payloadPathOptions"
        option-label="label"
        option-value="value"
        placeholder="Record id from event"
        class="min-w-[12rem] flex-1"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-int-id-${blockKey}`))"
        @update:model-value="(path) => path && onIntegrationRecordIdPathUpdate(path)"
      />
      <div
        v-if="integrationMappingViews.automaticMappings.length"
        class="lab-workflow-integration-field-map-auto w-full"
      >
        <p class="lab-workflow-integration-field-map-auto__title">Set automatically</p>
        <ul class="lab-workflow-integration-field-map-auto__list">
          <li
            v-for="row in integrationMappingViews.automaticMappings"
            :key="`${blockKey}-int-auto-${row.field}`"
          >
            <span class="lab-workflow-integration-field-map-auto__field">{{ row.fieldLabel }}</span>
            <span class="lab-workflow-integration-field-map-auto__summary">{{ row.summary }}</span>
          </li>
        </ul>
      </div>
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Map any other fields you want to copy from the event into the new record.
      </p>
      <div class="lab-workflow-integration-field-map w-full">
        <div class="lab-workflow-integration-field-map__header">
          <span>From event</span>
          <span>To record field</span>
          <span class="lab-workflow-integration-field-map__actions" aria-hidden="true" />
        </div>
        <div
          v-for="row in integrationMappingViews.userMappings"
          :key="`${blockKey}-int-body-${row.field}`"
          class="lab-workflow-integration-field-map__row"
        >
          <Select
            :model-value="payloadPathSelectValue(row.sourcePath, integrationPayloadPathOptions)"
            :options="integrationPayloadPathOptions"
            option-label="label"
            option-value="value"
            placeholder="Event field"
            class="min-w-0 w-full"
            :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-int-src-${blockKey}-${row.field}`))"
            @update:model-value="
              (path) =>
                path &&
                onIntegrationBodySourceChange(
                  row.field,
                  path === '__path_custom__' ? row.sourcePath : `payload.${path}`,
                )
            "
          />
          <Select
            v-if="integrationBodyFieldOptions.length"
            :model-value="row.field"
            :options="integrationBodyFieldOptions"
            option-label="label"
            option-value="value"
            placeholder="Record field"
            class="min-w-0 w-full"
            :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-int-field-${blockKey}-${row.field}`))"
            @update:model-value="(field) => field && onIntegrationBodyFieldChange(row.field, field)"
          />
          <InputText
            v-else
            :model-value="row.field"
            placeholder="Record field"
            class="min-w-0 w-full text-sm"
            :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-int-field-text-${blockKey}-${row.field}`))"
            @update:model-value="(field) => field && onIntegrationBodyFieldChange(row.field, field)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            class="lab-workflow-integration-field-map__remove"
            :pt="{
              root: { attrs: { id: generateUniqueId(`wf-flow-int-body-rm-${blockKey}-${row.field}`) } },
            }"
            @click="removeIntegrationBodyMappingRow(row.field)"
          />
        </div>
      </div>
      <Button
        label="Add field mapping"
        icon="pi pi-plus"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId(`wf-flow-int-body-add-${blockKey}`) } } }"
        @click="addIntegrationBodyMappingRow"
      />
    </template>
    <template v-if="step.kind === 'notify_users'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Message (optional). Use <strong>Insert field</strong> for <code v-pre>{{payload.field}}</code>
        snippets, or leave blank for built-in wording.
      </p>
      <LabWorkflowPayloadTemplateInput
        :model-value="step.message?.title ?? ''"
        :placeholder="MESSAGE_TITLE_PLACEHOLDER"
        :id-prefix="`wf-flow-msg-title-${blockKey}`"
        :captured-payload-fields="quarksItemFieldHints"
        :payload-path-options="payloadPathOptions"
        @update:model-value="(value) => onMessageFieldUpdate(step, 'title', value)"
      />
      <LabWorkflowPayloadTemplateInput
        :model-value="step.message?.body ?? ''"
        :placeholder="MESSAGE_BODY_PLACEHOLDER"
        :id-prefix="`wf-flow-msg-body-${blockKey}`"
        multiline
        :rows="2"
        @update:model-value="(value) => onMessageFieldUpdate(step, 'body', value)"
        :captured-payload-fields="quarksItemFieldHints"
        :payload-path-options="payloadPathOptions"
      />
    </template>
    <template v-else-if="step.kind === 'publish_event'">
      <InputText
        :model-value="step.type"
        placeholder="event.type"
        class="min-w-[10rem] font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-pub-type-${blockKey}`))"
        @update:model-value="(type) => type && onPublishEventTypeUpdate(type)"
      />
      <InputText
        :model-value="step.sourceAppId"
        placeholder="sourceAppId"
        class="min-w-[10rem] font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-pub-app-${blockKey}`))"
        @update:model-value="(sourceAppId) => sourceAppId && onPublishSourceAppIdUpdate(sourceAppId)"
      />
    </template>
    <!--
      Data nodes (A2–A6): edited as JSON, validated by the same Zod schema the server uses. Each
      input keeps its previous value on a parse error rather than resetting the step.
    -->
    <template v-else-if="step.kind === 'set_fields'">
      <LabWorkflowSetFieldsEditor
        :fields="step.fields"
        :payload-path-options="payloadPathOptions"
        :captured-payload-fields="quarksItemFieldHints"
        :block-key="blockKey"
        @update:fields="onSetFieldsChange"
      />
    </template>
    <template v-else-if="step.kind === 'code'">
      <LabWorkflowCodeNodeEditor
        :source="step.source"
        :payload-paths="capturedPayloadFields ?? []"
        :block-key="blockKey"
        @update:source="onCodeSourceChange"
      />
    </template>
    <template v-else-if="step.kind === 'rename_fields'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Example: <code>{"renames":[{"from":"a","to":"b"}],"remove":["tmp"]}</code>
      </p>
      <InputText
        :model-value="jsonText({ renames: step.renames ?? [], remove: step.remove ?? [] })"
        :placeholder="RENAME_FIELDS_PLACEHOLDER"
        class="min-w-[16rem] flex-1 font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-rename-${blockKey}`))"
        @update:model-value="onRenameFieldsJson"
      />
    </template>
    <template v-else-if="step.kind === 'date_time'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Operations, as JSON. <code>op</code> is <code>add</code>, <code>subtract</code> or
        <code>format</code>; <code>zone</code> is an IANA name such as
        <code>America/Denver</code>.
      </p>
      <InputText
        :model-value="jsonText(step.operations)"
        :placeholder="DATE_TIME_PLACEHOLDER"
        class="min-w-[16rem] flex-1 font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-date-${blockKey}`))"
        @update:model-value="onDateTimeJson"
      />
    </template>
    <template v-else-if="step.kind === 'filter_items'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Conditions, as JSON — the same vocabulary as a rule node, payload-only.
      </p>
      <InputText
        :model-value="jsonText(step.conditions)"
        :placeholder="FILTER_PLACEHOLDER"
        class="min-w-[16rem] flex-1 font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-filter-${blockKey}`))"
        @update:model-value="onFilterFieldsJson"
      />
      <Select
        :model-value="step.combine ?? 'all'"
        :options="[
          { label: 'Match all', value: 'all' },
          { label: 'Match any', value: 'any' },
        ]"
        option-label="label"
        option-value="value"
        class="min-w-[8rem]"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-filter-combine-${blockKey}`))"
        @update:model-value="onFilterCombineChange"
      />
    </template>
    <template v-else-if="step.kind === 'sort_items'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Example: <code>{"sort":[{"path":"createdAt","direction":"desc"}],"limit":10}</code>
      </p>
      <InputText
        :model-value="
          jsonText({ sort: step.sort ?? [], limit: step.limit, dedupeBy: step.dedupeBy })
        "
        :placeholder="SORT_PLACEHOLDER"
        class="min-w-[16rem] flex-1 font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-sort-${blockKey}`))"
        @update:model-value="onSortFieldsJson"
      />
    </template>
    <!--
      Bounded loop. This branch was missing entirely, so selecting a Loop showed the generic "What
      this node does" blurb and no controls at all — the cap and the while-condition were only
      editable by editing JSON. The cap is required and capped at 100 by the schema, because an
      uncapped loop is a hang; the while list is optional (empty means "run the body N times").
    -->
    <template v-else-if="step.kind === 'loop'">
      <label class="lab-workflow-flow-step-editor__field-label">
        Max iterations
      </label>
      <InputText
        :model-value="String(step.maxIterations)"
        type="number"
        min="1"
        max="100"
        class="w-full"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-loop-max-${blockKey}`))"
        @update:model-value="(v) => onLoopMaxIterationsChange(v)"
      />
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        The loop stops after this many passes even if the condition is still true. Max 100.
      </p>
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        <strong>While</strong> — run the body again while these match. Leave empty to run the body a
        fixed number of times.
      </p>
      <LabWorkflowPayloadConditionFields
        v-if="catalogEntries?.length"
        :conditions="step.while ?? []"
        :trigger-event-type="triggerEventType ?? ''"
        :catalog-entries="catalogEntries"
        :integration-service-catalog="integrationServiceCatalog"
        :lab-user-options="labUserOptionsForConditions"
        :captured-payload-fields="quarksItemFieldHints"
        :field-key-prefix="`wf-flow-loop-${blockKey}`"
        @update:conditions="
          (conditions) =>
            step.kind === 'loop' &&
            emit('update:step', {
              kind: 'loop',
              maxIterations: step.maxIterations,
              ...(conditions.length ? { while: conditions } : {}),
            })
        "
      />
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Connections choose the exit: <strong>While</strong> (port 0) repeats the body,
        <strong>Done</strong> (port 1) continues after the loop.
      </p>
    </template>
    <!-- Routing nodes (W7). Ports are chosen on the connection, not here. -->
    <template v-else-if="step.kind === 'if_condition'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Outgoing connections choose the <strong>true</strong> (port 0) or <strong>false</strong> (port 1)
        branch.
      </p>
      <LabWorkflowPayloadConditionFields
        v-if="catalogEntries?.length"
        :conditions="step.conditions"
        :combine="step.combine"
        show-combine
        :trigger-event-type="triggerEventType ?? ''"
        :catalog-entries="catalogEntries"
        :integration-service-catalog="integrationServiceCatalog"
        :lab-user-options="labUserOptionsForConditions"
        :captured-payload-fields="quarksItemFieldHints"
        :field-key-prefix="`wf-flow-if-${blockKey}`"
        @update:conditions="
          (conditions) =>
            step.kind === 'if_condition' &&
            emit('update:step', { kind: 'if_condition', conditions, combine: step.combine })
        "
        @update:combine="
          (combine) =>
            step.kind === 'if_condition' &&
            emit('update:step', { kind: 'if_condition', conditions: step.conditions, combine })
        "
      />
    </template>
    <template v-else-if="step.kind === 'switch_condition'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        One entry per branch, as JSON. Each connection picks its branch number (port); the last port
        is the fallback.
      </p>
      <InputText
        :model-value="jsonText(step.routings)"
        :placeholder="SWITCH_PLACEHOLDER"
        class="min-w-[16rem] flex-1 font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-switch-${blockKey}`))"
        @update:model-value="onSwitchRoutingsJson"
      />
    </template>
    <template v-else-if="step.kind === 'split_out'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Path holding the array. Each element becomes its own item.
      </p>
      <InputText
        :model-value="step.path"
        placeholder="items"
        class="min-w-[12rem] flex-1 font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-split-path-${blockKey}`))"
        @update:model-value="onSplitOutPathUpdate"
      />
      <InputText
        :model-value="step.targetPath ?? ''"
        placeholder="write to path (optional)"
        class="min-w-[12rem] font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-split-target-${blockKey}`))"
        @update:model-value="onSplitOutTargetUpdate"
      />
    </template>
    <template v-else-if="step.kind === 'merge_items'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Runs once, after every incoming branch has arrived. A branch that never ran counts as no rows.
      </p>
      <Select
        :model-value="step.mode"
        :options="MERGE_MODE_OPTIONS"
        option-label="label"
        option-value="value"
        class="min-w-[12rem]"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-merge-mode-${blockKey}`))"
        @update:model-value="onMergeModeChange"
      />
      <InputText
        v-if="step.mode === 'by_key'"
        :model-value="step.keyPath ?? ''"
        placeholder="key field, e.g. taskId"
        class="min-w-[12rem] font-mono text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-merge-key-${blockKey}`))"
        @update:model-value="onMergeKeyPathUpdate"
      />
      <Select
        v-if="step.mode !== 'append'"
        :model-value="step.includeUnpaired === true"
        :options="MERGE_UNPAIRED_OPTIONS"
        option-label="label"
        option-value="value"
        class="min-w-[12rem]"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-merge-unpaired-${blockKey}`))"
        @update:model-value="onMergeIncludeUnpairedChange"
      />
    </template>
    <template v-else-if="step.kind === 'http_request'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Call a public HTTPS API. URL supports payload templates — use <strong>Insert field</strong> below.
        Map event fields into the JSON body (same pattern as integration writes).
      </p>
      <Select
        :model-value="step.method"
        :options="HTTP_METHOD_OPTIONS"
        option-label="label"
        option-value="value"
        class="min-w-[8rem]"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-http-method-${blockKey}`))"
        @update:model-value="onHttpMethodChange"
      />
      <LabWorkflowPayloadTemplateInput
        :model-value="step.url"
        placeholder="https://api.example.com/resource"
        :id-prefix="`wf-flow-http-url-${blockKey}`"
        input-class="min-w-[12rem] flex-1 font-mono text-sm"
        :captured-payload-fields="quarksItemFieldHints"
        :payload-path-options="payloadPathOptions"
        @update:model-value="onHttpUrlChange"
      />
      <InputText
        :model-value="httpAllowListDisplay"
        placeholder="Allowed hosts (optional, comma-separated)"
        class="min-w-[12rem] flex-1 text-sm"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-http-allow-${blockKey}`))"
        @update:model-value="onHttpAllowListChange"
      />
      <p
        v-if="step.method !== 'GET' && step.method !== 'DELETE'"
        class="m-0 w-full text-xs text-lab-general-text-muted"
      >
        Map event fields into JSON body keys for {{ step.method }} requests.
      </p>
      <div
        v-if="step.method !== 'GET' && step.method !== 'DELETE'"
        class="lab-workflow-integration-field-map w-full"
      >
        <div class="lab-workflow-integration-field-map__header">
          <span>From event</span>
          <span>JSON field</span>
          <span class="lab-workflow-integration-field-map__actions" aria-hidden="true" />
        </div>
        <div
          v-for="row in httpBodyMappings"
          :key="`${blockKey}-http-body-${row.field}`"
          class="lab-workflow-integration-field-map__row"
        >
          <Select
            :model-value="payloadPathSelectValue(row.sourcePath, integrationPayloadPathOptions)"
            :options="integrationPayloadPathOptions"
            option-label="label"
            option-value="value"
            placeholder="Event field"
            class="min-w-0 w-full"
            :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-http-src-${blockKey}-${row.field}`))"
            @update:model-value="
              (path) =>
                path &&
                onHttpBodySourceChange(
                  row.field,
                  path === '__path_custom__' ? row.sourcePath : `payload.${path}`,
                )
            "
          />
          <InputText
            :model-value="row.field"
            placeholder="JSON key"
            class="min-w-0 w-full font-mono text-sm"
            :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-http-field-${blockKey}-${row.field}`))"
            @update:model-value="(field) => field && onHttpBodyFieldChange(row.field, field)"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            class="lab-workflow-integration-field-map__remove"
            :pt="{
              root: { attrs: { id: generateUniqueId(`wf-flow-http-body-rm-${blockKey}-${row.field}`) } },
            }"
            @click="removeHttpBodyMappingRow(row.field)"
          />
        </div>
      </div>
      <Button
        v-if="step.method !== 'GET' && step.method !== 'DELETE'"
        label="Add body field"
        icon="pi pi-plus"
        size="small"
        :pt="{ root: { attrs: { id: generateUniqueId(`wf-flow-http-body-add-${blockKey}`) } } }"
        @click="addHttpBodyMappingRow"
      />
    </template>
    <template
      v-else-if="
        step.kind === 'virtual_bank_get_wallet' || step.kind === 'virtual_bank_credit_daily_allotment'
      "
    >
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        <template v-if="step.kind === 'virtual_bank_get_wallet'">
          Reads Quarks balance and <code>dailyAllotmentEligible</code> on the item without posting
          accrual — use those fields in IF nodes.
        </template>
        <template v-else>
          Applies the canonical daily Quarks credit for the resolved user (writes
          <code>accrualDelta</code>, <code>balanceAfter</code> on the item).
        </template>
      </p>
      <label v-if="blockKey === 'graph-action'" class="lab-workflow-flow-step-editor__field-label">
        Lab user id from item field
      </label>
      <Select
        v-if="workflowItemPathOptions.length"
        :model-value="payloadPathSelectValue(step.userIdPath ?? 'userId', workflowItemPathOptions)"
        :options="workflowItemPathOptions"
        option-label="label"
        option-value="value"
        placeholder="userId"
        class="min-w-[12rem] flex-1"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-quarks-user-${blockKey}`))"
        @update:model-value="onQuarksUserIdPathUpdate"
      />
      <InputText
        v-if="
          payloadPathSelectValue(step.userIdPath ?? 'userId', workflowItemPathOptions) ===
            CUSTOM_PATH_SENTINEL ||
          workflowItemPathOptions.length === 0
        "
        :model-value="step.userIdPath ?? 'userId'"
        placeholder="userId"
        class="min-w-[12rem] flex-1 font-mono text-sm"
        :pt="
          withFormControlRootId(
            formInputTextPt,
            generateUniqueId(`wf-flow-quarks-user-text-${blockKey}`),
          )
        "
        @update:model-value="onQuarksUserIdPathUpdate"
      />
    </template>
    <template v-else-if="step.kind === 'show_user_toast'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Shell PrimeVue toast (not bell notifications). Use <strong>Insert field</strong> for item
        fields such as <code>accrualDelta</code>, or <code v-pre>{{payload.userId}}</code> from the
        trigger.
      </p>
      <label v-if="blockKey === 'graph-action'" class="lab-workflow-flow-step-editor__field-label">
        Lab user id from item field
      </label>
      <Select
        :model-value="step.userIdPath ?? 'userId'"
        :options="workflowItemPathOptions"
        option-label="label"
        option-value="value"
        class="min-w-[12rem] flex-1"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-toast-user-${blockKey}`))"
        @update:model-value="onQuarksUserIdPathUpdate"
      />
      <label v-if="blockKey === 'graph-action'" class="lab-workflow-flow-step-editor__field-label">
        Severity
      </label>
      <Select
        :model-value="step.severity"
        :options="TOAST_SEVERITY_OPTIONS"
        option-label="label"
        option-value="value"
        class="min-w-[10rem]"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-toast-sev-${blockKey}`))"
        @update:model-value="onShowUserToastSeverityChange"
      />
      <LabWorkflowPayloadTemplateInput
        :model-value="step.summary"
        :placeholder="TOAST_SUMMARY_PLACEHOLDER"
        :id-prefix="`wf-flow-toast-summary-${blockKey}`"
        snippet-style="item"
        :captured-payload-fields="quarksItemFieldHints"
        :payload-path-options="payloadPathOptions"
        :extra-insert-options="LAB_WORKFLOW_TOAST_ITEM_INSERT_OPTIONS"
        @update:model-value="(value) => onShowUserToastFieldUpdate('summary', value)"
      />
      <LabWorkflowPayloadTemplateInput
        :model-value="step.detail ?? ''"
        :placeholder="TOAST_DETAIL_PLACEHOLDER"
        :id-prefix="`wf-flow-toast-detail-${blockKey}`"
        multiline
        :rows="2"
        snippet-style="item"
        :captured-payload-fields="quarksItemFieldHints"
        :payload-path-options="payloadPathOptions"
        :extra-insert-options="LAB_WORKFLOW_TOAST_ITEM_INSERT_OPTIONS"
        @update:model-value="(value) => onShowUserToastFieldUpdate('detail', value)"
      />
    </template>
    <template v-else-if="step.kind === 'wait'">
      <p class="m-0 w-full text-xs text-lab-general-text-muted">
        Pauses this run. It resumes on the platform clock, so restarting the backend does not lose it.
      </p>
      <InputText
        :model-value="String(step.amount)"
        placeholder="1"
        class="min-w-[6rem]"
        :pt="withFormControlRootId(formInputTextPt, generateUniqueId(`wf-flow-wait-amount-${blockKey}`))"
        @update:model-value="onWaitAmountChange"
      />
      <Select
        :model-value="step.unit"
        :options="WAIT_UNIT_OPTIONS"
        option-label="label"
        option-value="value"
        class="min-w-[10rem]"
        :pt="withFormControlRootId(formSelectPt, generateUniqueId(`wf-flow-wait-unit-${blockKey}`))"
        @update:model-value="onWaitUnitChange"
      />
    </template>
  </div>
</template>
