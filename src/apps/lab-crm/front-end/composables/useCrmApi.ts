import { ref } from 'vue';
import type { EntityDefinition, EntityFormBinding, EntityProperty, LookupLabelsByField } from '../../shared/types/entity.types';
import type { ConnectorEntityRecord } from '../../shared/types/entity.types';
import { dedupeFormBindings } from '../../shared/utils/form-binding-resolution';
import { labAppFetch } from '@/shared/composables/useLabUserHeaders';

export interface FormBindingsLoadResult {
  bindings: EntityFormBinding[];
  staleDuplicateRows: number;
}

export function useCrmApi(serverUrl: string) {
  const base = serverUrl.replace(/\/$/, '');

  async function fetchDefinitions(): Promise<EntityDefinition[]> {
    const res = await labAppFetch(`${base}/api/entities/definitions`);
    if (!res.ok) {
      throw new Error(`Failed to load definitions (${res.status})`);
    }
    const body = (await res.json()) as { data: EntityDefinition[] };
    return body.data ?? [];
  }

  async function fetchRecords(
    entityKey: string,
    options?: { q?: string },
  ): Promise<{ records: ConnectorEntityRecord[]; lookupLabels: LookupLabelsByField }> {
    const qs = options?.q ? `?q=${encodeURIComponent(options.q)}` : '';
    const res = await labAppFetch(`${base}/api/entities/${entityKey}/records${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to load records (${res.status})`);
    }
    const body = (await res.json()) as {
      data: ConnectorEntityRecord[];
      lookupLabels?: LookupLabelsByField;
    };
    return {
      records: body.data ?? [],
      lookupLabels: body.lookupLabels ?? {},
    };
  }

  async function fetchFormBindings(entityKey?: string): Promise<FormBindingsLoadResult> {
    const qs = entityKey ? `?entityKey=${encodeURIComponent(entityKey)}` : '';
    const res = await labAppFetch(`${base}/api/form-bindings${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to load bindings (${res.status})`);
    }
    const body = (await res.json()) as {
      data: EntityFormBinding[];
      meta?: { staleDuplicateRows?: number };
    };
    const raw = body.data ?? [];
    const bindings = dedupeFormBindings(raw);
    const staleDuplicateRows =
      body.meta?.staleDuplicateRows ?? Math.max(0, raw.length - bindings.length);
    return { bindings, staleDuplicateRows };
  }

  async function dedupeFormBindingsInDb(): Promise<number> {
    const res = await labAppFetch(`${base}/api/form-bindings/dedupe`, { method: 'POST' });
    if (res.status === 404) {
      return 0;
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Dedupe failed (${res.status})`);
    }
    const body = (await res.json()) as { removed?: number };
    return body.removed ?? 0;
  }

  async function convertLead(leadId: number, saleData?: Record<string, unknown>): Promise<void> {
    const res = await labAppFetch(`${base}/api/leads/${leadId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleData: saleData ?? {} }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Convert failed (${res.status})`);
    }
  }

  async function upsertFormBinding(payload: {
    entityKey: string;
    purpose: 'create' | 'edit' | 'view';
    formKey: string;
    isDefault?: boolean;
  }): Promise<EntityFormBinding> {
    const res = await labAppFetch(`${base}/api/form-bindings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Failed to save binding (${res.status})`);
    }
    return (await res.json()) as EntityFormBinding;
  }

  async function setEntityFormKey(entityKey: string, formKey: string): Promise<void> {
    const url = `${base}/api/form-bindings/entity-form-key`;
    const payload = JSON.stringify({ entityKey, formKey });
    const res = await labAppFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (res.status === 404) {
      for (const purpose of ['create', 'edit'] as const) {
        await upsertFormBinding({ entityKey, purpose, formKey, isDefault: true });
      }
      await dedupeFormBindingsInDb();
      return;
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new Error(err.error ?? err.message ?? `Failed to save form key (${res.status})`);
    }
  }

  async function createDefinition(payload: {
    entityKey: string;
    name: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
    properties: EntityProperty[];
    lookupDisplayProperty?: string | null;
    lookupDisplayFormat?: string | null;
  }): Promise<EntityDefinition> {
    const res = await labAppFetch(`${base}/api/entities/definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
      const detail = err.details?.join('; ') ?? err.error ?? `Create failed (${res.status})`;
      throw new Error(detail);
    }
    return (await res.json()) as EntityDefinition;
  }

  async function updateDefinition(
    entityKey: string,
    patch: {
      name?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
      properties?: EntityProperty[];
      lookupDisplayProperty?: string | null;
      lookupDisplayFormat?: string | null;
    },
  ): Promise<EntityDefinition> {
    const res = await labAppFetch(`${base}/api/entities/definitions/${encodeURIComponent(entityKey)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
      const detail = err.details?.join('; ') ?? err.error ?? `Update failed (${res.status})`;
      throw new Error(detail);
    }
    return (await res.json()) as EntityDefinition;
  }

  async function deleteDefinition(entityKey: string): Promise<void> {
    const res = await labAppFetch(`${base}/api/entities/definitions/${encodeURIComponent(entityKey)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Delete failed (${res.status})`);
    }
  }

  async function reorderDefinitions(entityKeys: string[]): Promise<EntityDefinition[]> {
    const res = await labAppFetch(`${base}/api/entities/definitions/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityKeys }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
      const detail = err.details?.join('; ') ?? err.error ?? `Reorder failed (${res.status})`;
      throw new Error(detail);
    }
    const body = (await res.json()) as { data: EntityDefinition[] };
    return body.data ?? [];
  }

  return {
    fetchDefinitions,
    fetchRecords,
    fetchFormBindings,
    dedupeFormBindingsInDb,
    convertLead,
    upsertFormBinding,
    setEntityFormKey,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    reorderDefinitions,
  };
}

export function useEntityWorkspace(serverUrl: string, entityKey: string) {
  const api = useCrmApi(serverUrl);
  const records = ref<ConnectorEntityRecord[]>([]);
  const lookupLabels = ref<LookupLabelsByField>({});
  const loading = ref(false);
  const loadError = ref<string | null>(null);
  const definition = ref<EntityDefinition | null>(null);

  async function refresh(serverSearch?: string): Promise<void> {
    loading.value = true;
    loadError.value = null;
    try {
      const defs = await api.fetchDefinitions();
      definition.value = defs.find((d) => d.entityKey === entityKey) ?? null;
      const loaded = await api.fetchRecords(entityKey, { q: serverSearch });
      records.value = loaded.records;
      lookupLabels.value = loaded.lookupLabels;
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load records';
      records.value = [];
      lookupLabels.value = {};
    } finally {
      loading.value = false;
    }
  }

  return { records, lookupLabels, loading, loadError, definition, refresh, api };
}
