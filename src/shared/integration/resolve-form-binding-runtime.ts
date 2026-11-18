import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

export interface FormBindingRuntimeContext {
  formKey: string;
  connectorEntitySegment: string;
  serviceId?: string;
  recordId: string | number | null;
  presetValues: Record<string, unknown>;
}

export function resolveServiceIdForBinding(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  binding: LabIntegrationBindingRecord,
): string | undefined {
  if (binding.config.serviceId) {
    return binding.config.serviceId;
  }
  return manifest?.accepts?.find((accept) => accept.slot === binding.slot)?.requiresServiceId;
}

export function resolveConnectorSegmentForBinding(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  binding: LabIntegrationBindingRecord,
): string | undefined {
  const serviceId = resolveServiceIdForBinding(manifest, binding);
  if (!serviceId) {
    return undefined;
  }
  return manifest?.integrationServices?.find((service) => service.serviceId === serviceId)?.connector
    ?.segment;
}

export function resolveFormBindingRuntime(
  manifest: AppLabIntegrationManifestV1 | null | undefined,
  binding: LabIntegrationBindingRecord,
  context: Record<string, unknown>,
): FormBindingRuntimeContext | null {
  const connectorEntitySegment = resolveConnectorSegmentForBinding(manifest, binding);
  if (!connectorEntitySegment) {
    return null;
  }
  const accept = manifest?.accepts?.find((row) => row.slot === binding.slot);
  const presetValues: Record<string, unknown> = {};
  // Host-supplied field values (e.g. lat/lon from a city picker). Applied before the
  // context-derived presets so explicit host intent wins, and kept out of the id-resolution
  // walk below — a `latitude` key must never be mistaken for a record id.
  const hostPreset = context.formPresetValues;
  if (hostPreset && typeof hostPreset === 'object') {
    Object.assign(presetValues, hostPreset as Record<string, unknown>);
  }
  const filterMap = binding.config.filterMap ?? {};
  for (const [contextKey, fieldName] of Object.entries(filterMap)) {
    if (context[contextKey] !== undefined) {
      presetValues[fieldName] = context[contextKey];
    }
  }
  for (const key of accept?.contextKeys ?? []) {
    if (context[key] !== undefined && presetValues[key] === undefined) {
      presetValues[key] = context[key];
    }
  }

  function coerceContextId(raw: unknown): number | null {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
      return Number(raw);
    }
    return null;
  }

  function coerceContextRecordId(raw: unknown): string | number | null {
    if (typeof raw === 'string' && raw.trim() !== '') {
      return raw.trim();
    }
    return coerceContextId(raw);
  }

  const chartSlots = new Set([
    'chart.edit.dialog',
    'chart.delete.dialog',
    'chart.designer.metadata',
    'chart.designer.connector',
  ]);

  let recordId: string | number | null = null;
  if (binding.slot.endsWith('.create.dialog')) {
    recordId = null;
  } else if (chartSlots.has(binding.slot)) {
    const key = typeof context.chartKey === 'string' ? context.chartKey.trim() : '';
    if (key && context.loadChartRecord === true) {
      recordId = key;
    } else {
      recordId = null;
    }
  } else if (binding.slot === 'task-list.edit.dialog' || binding.slot === 'task-list.delete.dialog') {
    recordId = coerceContextId(context.taskListId);
  } else if (binding.slot === 'task.edit.dialog' || binding.slot === 'task.delete.dialog') {
    recordId = coerceContextId(context.taskId);
  } else if (binding.slot === 'crm.task.edit.dialog' || binding.slot === 'crm.task.delete.dialog') {
    recordId = coerceContextId(context.taskId);
  } else if (binding.slot === 'ticket.edit.dialog' || binding.slot === 'ticket.delete.dialog') {
    recordId = coerceContextId(context.ticketId);
  } else if (
    binding.slot === 'kanban.board.edit.dialog'
    || binding.slot === 'kanban.board.delete.dialog'
  ) {
    recordId = coerceContextId(context.boardId);
  } else if (binding.slot === 'crm.ticket.edit.dialog' || binding.slot === 'crm.ticket.delete.dialog') {
    recordId = coerceContextId(context.ticketId);
  } else if (
    binding.slot === 'crm.ledger.entry.post.dialog'
    || binding.slot === 'crm.ledger.account.create.dialog'
  ) {
    recordId = null;
  } else if (binding.slot === 'crm.approval.request.decide.dialog') {
    recordId =
      typeof context.requestId === 'string' && context.requestId.trim()
        ? context.requestId.trim()
        : null;
  } else if (binding.slot.endsWith('.delete.dialog') && binding.slot.startsWith('crm.')) {
    recordId = coerceContextId(context.recordId);
  } else if (binding.slot.endsWith('.edit.dialog') && binding.slot.startsWith('crm.')) {
    recordId = coerceContextId(context.recordId);
  } else if (
    binding.slot === 'chart.connector.edit.dialog'
    || binding.slot === 'chart.connector.delete.dialog'
  ) {
    recordId = coerceContextId(context.connectorId);
  } else if (
    (binding.slot.endsWith('.edit.dialog') || binding.slot.endsWith('.delete.dialog'))
    && (accept?.contextKeys?.length ?? 0) > 0
  ) {
    // Catalog hosts build edit/delete context keys as `[...parentKeys, idContextKey]`
    // (see `buildCatalogHostManifest`), so the entity's own id is the last entry. Without
    // this, slots like `location.edit.dialog` resolved no id, the dialog opened empty and
    // the host never fetched the record.
    for (let index = (accept?.contextKeys?.length ?? 0) - 1; index >= 0; index -= 1) {
      const key = accept?.contextKeys?.[index];
      if (!key) {
        continue;
      }
      // Numeric-string ids become numbers so they match a `number` primary key on the
      // connector record; non-numeric ids (e.g. `chartKey`) stay strings.
      const numeric = coerceContextId(context[key]);
      const parsed = numeric != null ? numeric : coerceContextRecordId(context[key]);
      if (parsed != null) {
        recordId = parsed;
        break;
      }
    }
  } else {
    const idKeys = [
      'recordId',
      'id',
      'ruleId',
      'workflowId',
      'policyId',
      'requestId',
      'accountId',
      'tagId',
    ];
    for (const key of idKeys) {
      const parsed = coerceContextRecordId(context[key]);
      if (parsed != null) {
        recordId = parsed;
        break;
      }
    }
    if (recordId == null && typeof context.chartKey === 'string' && context.chartKey.trim()) {
      recordId = context.chartKey.trim();
    }
  }

  return {
    formKey: binding.providerRef,
    connectorEntitySegment,
    serviceId: resolveServiceIdForBinding(manifest, binding),
    recordId,
    presetValues,
  };
}
