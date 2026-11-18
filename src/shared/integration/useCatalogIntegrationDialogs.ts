import { computed, ref, unref, type MaybeRef, type Ref } from 'vue';
import type LabIntegrationSurface from './components/LabIntegrationSurface.vue';
import { getCatalogIntegrationMeta } from './catalog-integration-meta';

export function useCatalogIntegrationDialogs(options: {
  hostAppId: string;
  surfaceId: MaybeRef<string>;
  serverUrl: Ref<string | undefined>;
  idContextKey: MaybeRef<string>;
}) {
  const integrationSurfaceRef = ref<InstanceType<typeof LabIntegrationSurface> | null>(null);
  const entityId = ref<number | null>(null);
  const activeIdContextKey = ref<string>(unref(options.idContextKey));

  const integrationContext = computed((): Record<string, unknown> => {
    const ctx: Record<string, unknown> = {};
    if (entityId.value != null) {
      ctx[activeIdContextKey.value] = entityId.value;
    }
    return ctx;
  });

  const serverUrlForIntegration = computed(() => options.serverUrl.value?.trim() ?? '');

  function openCreate(slot: string): void {
    entityId.value = null;
    activeIdContextKey.value = unref(options.idContextKey);
    integrationSurfaceRef.value?.openSlot(slot);
  }

  function openEdit(slot: string, id: number, idContextKey?: string): void {
    entityId.value = id;
    if (idContextKey?.trim()) {
      activeIdContextKey.value = idContextKey.trim();
    }
    integrationSurfaceRef.value?.openSlot(slot);
  }

  function openDelete(slot: string, id: number, idContextKey?: string): void {
    entityId.value = id;
    if (idContextKey?.trim()) {
      activeIdContextKey.value = idContextKey.trim();
    }
    integrationSurfaceRef.value?.openSlot(slot);
  }

  function clearIntegrationContext(): void {
    entityId.value = null;
  }

  async function onIntegrationSuccess(
    payload: { slot: string },
    refresh: () => Promise<void>,
  ): Promise<void> {
    clearIntegrationContext();
    await refresh();
  }

  return {
    integrationSurfaceRef,
    integrationContext,
    serverUrlForIntegration,
    openCreate,
    openEdit,
    openDelete,
    onIntegrationSuccess,
  };
}

/** Catalog hosts — resolves manifest slots from `hostAppId`. */
export function useCatalogHostDialogs(
  hostAppId: string,
  serverUrl: Ref<string | undefined>,
) {
  const meta = computed(() => getCatalogIntegrationMeta(hostAppId));
  const parentContext = ref<Record<string, unknown>>({});
  /**
   * Field values the host already knows (e.g. lat/lon resolved from a city picker).
   *
   * Kept separate from `parentContext` because context keys are id-scoped (`locationId`) while
   * these are form field names. A host that must *pre-fill* a create form cannot express that
   * through context alone — context only seeds slots whose `contextKeys` name the field.
   */
  const presetValues = ref<Record<string, unknown>>({});

  const dialogs = useCatalogIntegrationDialogs({
    hostAppId,
    surfaceId: computed(() => meta.value?.surfaceId ?? ''),
    serverUrl,
    idContextKey: computed(() => meta.value?.primary.idContextKey ?? 'id'),
  });

  const integrationContext = computed((): Record<string, unknown> => ({
    ...parentContext.value,
    ...dialogs.integrationContext.value,
    // Reserved channel: `resolveFormBindingRuntime` merges it into `presetValues`, keeping it
    // out of the id-resolution walk (a `name`/`latitude` key must never be read as a record id).
    ...(Object.keys(presetValues.value).length > 0
      ? { formPresetValues: presetValues.value }
      : {}),
  }));

  function setParentContext(ctx: Record<string, unknown>): void {
    parentContext.value = { ...ctx };
  }

  function clearParentContext(): void {
    parentContext.value = {};
  }

  /** Pre-fill form fields by field name (applies to create *and* edit). */
  function setPresetValues(values: Record<string, unknown>): void {
    presetValues.value = { ...values };
  }

  function clearPresetValues(): void {
    presetValues.value = {};
  }

  function openEntityCreate(entityKey: string, parentCtx?: Record<string, unknown>): void {
    const entity = meta.value?.entities.find((row) => row.entityKey === entityKey);
    if (!entity) return;
    if (parentCtx) {
      setParentContext(parentCtx);
    }
    dialogs.openCreate(entity.slots.create);
  }

  function openEntityEdit(
    entityKey: string,
    id: number,
    parentCtx?: Record<string, unknown>,
  ): void {
    const entity = meta.value?.entities.find((row) => row.entityKey === entityKey);
    if (!entity) return;
    if (parentCtx) {
      setParentContext(parentCtx);
    }
    dialogs.openEdit(entity.slots.edit, id, entity.idContextKey);
  }

  function openEntityDelete(
    entityKey: string,
    id: number,
    parentCtx?: Record<string, unknown>,
  ): void {
    const entity = meta.value?.entities.find((row) => row.entityKey === entityKey);
    if (!entity) return;
    if (parentCtx) {
      setParentContext(parentCtx);
    }
    dialogs.openDelete(entity.slots.delete, id, entity.idContextKey);
  }

  /** `preset` pre-fills form fields by name — used when the host resolved values itself. */
  function openPrimaryCreate(preset?: Record<string, unknown>): void {
    clearParentContext();
    presetValues.value = preset ? { ...preset } : {};
    openEntityCreate(meta.value?.primary.entityKey ?? '');
  }

  function openPrimaryEdit(id: number, preset?: Record<string, unknown>): void {
    clearParentContext();
    presetValues.value = preset ? { ...preset } : {};
    openEntityEdit(meta.value?.primary.entityKey ?? '', id);
  }

  function openPrimaryDelete(id: number): void {
    clearParentContext();
    presetValues.value = {};
    openEntityDelete(meta.value?.primary.entityKey ?? '', id);
  }

  const {
    integrationSurfaceRef,
    serverUrlForIntegration,
    openCreate,
    openEdit,
    openDelete,
    onIntegrationSuccess,
  } = dialogs;

  return {
    integrationSurfaceRef,
    integrationContext,
    serverUrlForIntegration,
    openCreate,
    openEdit,
    openDelete,
    onIntegrationSuccess,
    meta,
    setParentContext,
    clearParentContext,
    setPresetValues,
    clearPresetValues,
    openEntityCreate,
    openEntityEdit,
    openEntityDelete,
    openPrimaryCreate,
    openPrimaryEdit,
    openPrimaryDelete,
  };
}
