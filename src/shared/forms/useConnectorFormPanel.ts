import { nextTick, ref, watch, type Ref } from 'vue';
import { getFieldErrorsFromError } from './form-validation-error';
import { mapRecordToFieldValues, coerceRecordValueForField } from './form-submit-payload';
import { submitFormToFormsBuilder } from './submit-to-forms-builder';
import { deleteRecordViaConnectorApi, submitRecordToConnectorApi } from './submit-to-connector-api';
import type { FormFieldValidationError } from './form-field-validation';
import type { IFormRuntimeField, LoadedFormSchema } from './form-runtime-types';
import { getLabUserHeaders, labAppFetch } from '@/shared/composables/useLabUserHeaders';
import { isApprovalRequestDecideSlot } from '@/shared/lab-integrations/approval-request-form-stub-filter';

export type ConnectorFormSubmitMode = 'forms-builder' | 'connector-api' | 'connector-delete';

export interface UseConnectorFormPanelOptions {
  formsBuilderUrl: Ref<string> | (() => string);
  formKey: Ref<string> | (() => string);
  serverUrl: Ref<string> | (() => string);
  connectorEntitySegment: Ref<string> | (() => string);
  recordId: Ref<string | number | null | undefined> | (() => string | number | null | undefined);
  presetValues: Ref<Record<string, unknown> | undefined> | (() => Record<string, unknown> | undefined);
  loadFailureMessage?: string;
  useAuthenticatedConnectorFetch?: boolean;
  submitMode?: ConnectorFormSubmitMode;
  hostAppId?: Ref<string | undefined> | (() => string | undefined);
  integrationSlot?: Ref<string | undefined> | (() => string | undefined);
  prepareSubmitPayload?: (data: Record<string, unknown>) => Record<string, unknown>;
  onSuccess: () => void;
  onCancel: () => void;
}

function resolve<T>(source: Ref<T> | (() => T)): T {
  return typeof source === 'function' ? (source as () => T)() : source.value;
}

/** Shared connector + FormMounter panel logic (rm-46 **3.4**). */
export function useConnectorFormPanel(options: UseConnectorFormPanelOptions) {
  const mounterRef = ref<{
    setFieldValues: (values: Record<string, unknown>) => void;
    clearFieldValues: () => void;
    triggerSubmit: () => boolean;
  } | null>(null);

  const submitting = ref(false);
  const statusMessage = ref<{
    severity: 'success' | 'error' | 'info';
    text?: string;
  } | null>(null);
  const fieldValidationErrors = ref<FormFieldValidationError[]>([]);

  const useAuthFetch = options.useAuthenticatedConnectorFetch !== false;
  const submitMode = options.submitMode ?? 'forms-builder';

  function connectorFetchHeaders(): HeadersInit | undefined {
    const hostAppId = options.hostAppId ? resolve(options.hostAppId) : undefined;
    if (!hostAppId) {
      return undefined;
    }
    return getLabUserHeaders({ 'X-Host-App-Id': hostAppId });
  }

  function clearStatus(): void {
    statusMessage.value = null;
    fieldValidationErrors.value = [];
  }

  function connectorRecordUrl(id: string | number): string {
    const base = resolve(options.serverUrl).replace(/\/$/, '');
    const segment = resolve(options.connectorEntitySegment);
    return `${base}/api/connector/${segment}/${encodeURIComponent(String(id))}`;
  }

  async function fetchConnectorRecord(id: string | number): Promise<Response> {
    const url = connectorRecordUrl(id);
    const extraHeaders = connectorFetchHeaders();
    if (useAuthFetch) {
      return labAppFetch(url, extraHeaders ? { headers: extraHeaders } : undefined);
    }
    return fetch(url);
  }

  async function hydrateFromConnector(components: IFormRuntimeField[]): Promise<void> {
    const recordId = resolve(options.recordId);
    if (recordId == null) {
      return;
    }
    const response = await fetchConnectorRecord(recordId);
    if (!response.ok) {
      throw new Error(
        options.loadFailureMessage ?? `Could not load record (${response.status})`,
      );
    }
    const record = (await response.json()) as Record<string, unknown>;
    const values = mapRecordToFieldValues(components, record);
    await nextTick();
    mounterRef.value?.setFieldValues(values);
    await nextTick();
    mounterRef.value?.setFieldValues(values);
  }

  function applyPresetValues(
    components: IFormRuntimeField[],
    preset: Record<string, unknown>,
  ): void {
    const values: Record<string, unknown> = {};
    for (const field of components) {
      if (!field.fieldKey) {
        continue;
      }
      const prop = field.modelProperty ?? field.fieldKey;
      if (prop in preset) {
        values[field.fieldKey] = preset[prop];
      }
    }
    if (Object.keys(values).length > 0) {
      const coerced: Record<string, unknown> = {};
      for (const field of components) {
        if (!field.fieldKey || !(field.fieldKey in values)) {
          continue;
        }
        coerced[field.fieldKey] = coerceRecordValueForField(field, values[field.fieldKey]);
      }
      mounterRef.value?.setFieldValues(coerced);
    }
  }

  async function onFormLoaded(schema: LoadedFormSchema): Promise<void> {
    clearStatus();
    const components = (schema.components ?? []) as IFormRuntimeField[];
    try {
      const recordId = resolve(options.recordId);
      const preset = resolve(options.presetValues);
      if (submitMode === 'connector-delete') {
        // Confirm-only forms: no connector GET; message comes from Forms Builder Label / formActions.
      } else if (recordId != null) {
        await hydrateFromConnector(components);
        const slot = options.integrationSlot ? resolve(options.integrationSlot) : undefined;
        if (slot && isApprovalRequestDecideSlot(slot)) {
          await nextTick();
          mounterRef.value?.setFieldValues({ decision: undefined, comment: undefined });
        }
        // Edit mode still honours host presets. Without this, a host that resolved values
        // itself (e.g. read-only name/lat/lon from a city picker) could never pre-fill an
        // edit form — hydration would overwrite them, and presets were previously skipped
        // entirely whenever a record id was present.
        if (preset && Object.keys(preset).length > 0) {
          await nextTick();
          applyPresetValues(components, preset);
        }
      } else if (preset && Object.keys(preset).length > 0) {
        applyPresetValues(components, preset);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load record';
      statusMessage.value = { severity: 'error', text: message };
    }
  }

  function handleMounterError(err: Error): void {
    const fieldErrors = getFieldErrorsFromError(err);
    if (fieldErrors?.length) {
      fieldValidationErrors.value = fieldErrors;
      statusMessage.value = null;
      return;
    }
    fieldValidationErrors.value = [];
    statusMessage.value = { severity: 'error', text: err.message };
  }

  async function handleSubmit(data: Record<string, unknown>): Promise<void> {
    submitting.value = true;
    clearStatus();
    try {
      const preset = resolve(options.presetValues) ?? {};
      const fromForm = options.prepareSubmitPayload
        ? options.prepareSubmitPayload(data)
        : data;
      const payload = { ...preset, ...fromForm };

      if (submitMode === 'connector-delete') {
        const recordId = resolve(options.recordId);
        if (recordId == null) {
          throw new Error('Record id is required to delete.');
        }
        await deleteRecordViaConnectorApi({
          serverUrl: resolve(options.serverUrl),
          connectorEntitySegment: resolve(options.connectorEntitySegment),
          recordId,
          hostAppId: options.hostAppId ? resolve(options.hostAppId) : undefined,
        });
        options.onSuccess();
        return;
      }

      if (submitMode === 'connector-api') {
        await submitRecordToConnectorApi({
          serverUrl: resolve(options.serverUrl),
          connectorEntitySegment: resolve(options.connectorEntitySegment),
          recordId: resolve(options.recordId),
          data: payload,
          hostAppId: options.hostAppId ? resolve(options.hostAppId) : undefined,
        });
        options.onSuccess();
        return;
      }

      const result = await submitFormToFormsBuilder(
        resolve(options.formsBuilderUrl),
        resolve(options.formKey),
        payload,
      );
      if (result.success) {
        options.onSuccess();
      } else {
        statusMessage.value = {
          severity: 'error',
          text: result.message ?? 'Submission failed.',
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      statusMessage.value = { severity: 'error', text: message };
    } finally {
      submitting.value = false;
    }
  }

  function handleCancel(): void {
    clearStatus();
    options.onCancel();
  }

  watch(
    () =>
      [
        resolve(options.formKey),
        resolve(options.recordId),
        resolve(options.presetValues),
      ] as const,
    () => {
      clearStatus();
    },
  );

  return {
    mounterRef,
    submitting,
    statusMessage,
    fieldValidationErrors,
    onFormLoaded,
    handleMounterError,
    handleSubmit,
    handleCancel,
  };
}
