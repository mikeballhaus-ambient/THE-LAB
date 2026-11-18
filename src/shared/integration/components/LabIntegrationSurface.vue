<script setup lang="ts">
import { computed, provide, ref, toRef, type ComponentPublicInstance } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useUniqueElementId } from '@/shared/composables/useUniqueElementId';
import { useLabIntegrationSurface } from '../useLabIntegrationSurface';
import { labIntegrationHostContextKey } from '../lab-integration-host-context';
import { resolveHideButtonsForInlineForm } from '../resolve-region-hide-buttons';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';
import type { IntegrationSurfaceRegionDecl } from '@/shared/types/lab-integration-manifest';
import LabIntegrationSlot from './LabIntegrationSlot.vue';
import type { PeerUrlInput } from '@/shared/lab-integrations/resolve-integration-connector-server-url';

const props = withDefaults(
  defineProps<{
    hostAppId: string;
    surfaceId: string;
    serverUrl: string;
    peerConnectorUrls?: PeerUrlInput;
    context?: Record<string, unknown>;
    /** When true, dialog-region bindings render open buttons (dev / simple hosts). */
    showDialogTriggers?: boolean;
    /** When set, only these regions render inline slots (dialogs still work via openSlot). */
    inlineRegionIds?: string[];
    /** Hide region wrappers that have no inline bindings (and no dialog triggers). */
    hideEmptyRegions?: boolean;
  }>(),
  {
    context: () => ({}),
    showDialogTriggers: false,
    hideEmptyRegions: true,
  },
);

const emit = defineEmits<{
  (e: 'integration-success', payload: { slot: string }): void;
  (e: 'integration-cancel', payload: { slot: string }): void;
}>();

const { generateUniqueId } = useUniqueElementId();

const hostAppIdRef = toRef(props, 'hostAppId');
const surfaceIdRef = toRef(props, 'surfaceId');

const {
  manifest,
  surface,
  loading,
  error,
  bindingsInRegion,
  presentationFor,
  activeDialogSlot,
  openSlot,
  closeSlot,
  refresh,
  hasEnabledBinding,
  getInlineSlotsInRegion,
} = useLabIntegrationSurface(hostAppIdRef, surfaceIdRef);

const dialogBindings = computed(() => {
  if (!surface.value) {
    return [];
  }
  const rows: Array<{ regionId: string; binding: ReturnType<typeof bindingsInRegion>[number] }> =
    [];
  for (const region of surface.value.regions) {
    for (const binding of bindingsInRegion(region.regionId)) {
      if (presentationFor(binding, region.regionId) === 'dialog') {
        rows.push({ regionId: region.regionId, binding });
      }
    }
  }
  return rows;
});

const activeDialogRow = computed(() =>
  dialogBindings.value.find((row) => row.binding.slot === activeDialogSlot.value) ?? null,
);

const activeDialogBinding = computed(() => activeDialogRow.value?.binding ?? null);

const dialogVisible = computed({
  get: () => activeDialogSlot.value !== null,
  set: (visible: boolean) => {
    if (!visible) {
      closeSlot();
    }
  },
});

const activeDialogLabel = computed(() => {
  if (!activeDialogBinding.value) {
    return 'Integration';
  }
  const accept = manifest.value?.accepts?.find(
    (row) => row.slot === activeDialogBinding.value?.slot,
  );
  return accept?.label ?? activeDialogBinding.value.slot;
});

const inlineRegions = computed(() => {
  if (!surface.value) {
    return [];
  }
  return surface.value.regions.filter((region) => {
    if (!regionShouldRender(region.regionId)) {
      return false;
    }
    if (props.hideEmptyRegions && !regionHasVisibleContent(region.regionId)) {
      return false;
    }
    return true;
  });
});

const dialogRootId = generateUniqueId('lab-integration-dialog');

provide(labIntegrationHostContextKey, {
  hostAppId: props.hostAppId,
  serverUrl: props.serverUrl,
  openSlot,
  closeSlot,
  activeDialogSlot,
});

type InlineSlotHandle = { submit: () => Promise<void> };
const inlineSlotRefs = ref(new Map<string, InlineSlotHandle>());

function registerInlineSlotRef(
  slot: string,
  instance: Element | ComponentPublicInstance | null,
): void {
  let handle: InlineSlotHandle | undefined;
  if (instance && typeof instance === 'object' && 'submit' in instance) {
    const candidate = instance as InlineSlotHandle;
    if (typeof candidate.submit === 'function') {
      handle = candidate;
    }
  }

  const current = inlineSlotRefs.value.get(slot);
  if (handle) {
    if (current === handle) {
      return;
    }
    const next = new Map(inlineSlotRefs.value);
    next.set(slot, handle);
    inlineSlotRefs.value = next;
    return;
  }

  if (!inlineSlotRefs.value.has(slot)) {
    return;
  }
  const next = new Map(inlineSlotRefs.value);
  next.delete(slot);
  inlineSlotRefs.value = next;
}

async function submitInlineRegion(regionId: string): Promise<void> {
  const bindings = bindingsInRegion(regionId).filter(
    (binding) =>
      presentationFor(binding, regionId) === 'inline' && isIntegrationSlotVisible(binding),
  );
  for (const binding of bindings) {
    await inlineSlotRefs.value.get(binding.slot)?.submit();
  }
}

function hideFormActionsFor(binding: LabIntegrationBindingRecord, regionId: string): boolean {
  return resolveHideButtonsForInlineForm(manifest.value, props.surfaceId, regionId, binding);
}

function regionHideButtons(regionId: string): boolean {
  return resolveHideButtonsForInlineForm(manifest.value, props.surfaceId, regionId);
}

defineExpose({
  openSlot,
  closeSlot,
  refresh,
  hasEnabledBinding,
  getInlineSlotsInRegion,
  submitInlineRegion,
  regionHideButtons,
});

const integrationContext = computed(() => props.context ?? {});

function isIntegrationSlotVisible(binding: LabIntegrationBindingRecord): boolean {
  const map = integrationContext.value.integrationSlotVisibility as
    | Record<string, boolean>
    | undefined;
  if (!map) {
    return true;
  }
  if (binding.slot in map) {
    return map[binding.slot] === true;
  }
  // Host supplied a visibility map — only listed slots may render (explicit opt-in).
  return Object.keys(map).length === 0;
}

function slotLabel(slot: string): string {
  return manifest.value?.accepts?.find((row) => row.slot === slot)?.label ?? slot;
}

function regionShouldRender(regionId: string): boolean {
  if (props.inlineRegionIds !== undefined) {
    return props.inlineRegionIds.includes(regionId);
  }
  return true;
}

function inlineChartCountInRegion(regionId: string): number {
  return bindingsInRegion(regionId).filter((binding) => {
    if (!isIntegrationSlotVisible(binding)) {
      return false;
    }
    return presentationFor(binding, regionId) === 'inline';
  }).length;
}

function resolvedGridColumns(region: IntegrationSurfaceRegionDecl): 2 | 3 | 4 | undefined {
  if (region.gridColumns) {
    return region.gridColumns;
  }
  if (region.regionId !== 'reports.grid') {
    return undefined;
  }
  const count = inlineChartCountInRegion(region.regionId);
  if (count >= 4) {
    return 4;
  }
  if (count === 3) {
    return 3;
  }
  return undefined;
}

function regionLayoutClass(region: IntegrationSurfaceRegionDecl): string {
  if (region.layout !== 'grid') {
    return 'flex flex-col gap-3';
  }
  const cols = resolvedGridColumns(region);
  if (cols === 4) {
    return 'grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 min-w-0 [&>*]:min-w-0';
  }
  if (cols === 3) {
    return 'grid gap-3 grid-cols-3 min-w-0 [&>*]:min-w-0';
  }
  return 'grid gap-3 sm:grid-cols-2 min-w-0 [&>*]:min-w-0';
}

function regionHasVisibleContent(regionId: string): boolean {
  const bindings = bindingsInRegion(regionId);
  if (bindings.length === 0) {
    return false;
  }
  return bindings.some((binding) => {
    const presentation = presentationFor(binding, regionId);
    return presentation === 'inline' || (presentation === 'dialog' && props.showDialogTriggers);
  });
}

function dialogTriggerBindingsInRegion(regionId: string) {
  return bindingsInRegion(regionId).filter((binding) => {
    if (!isIntegrationSlotVisible(binding)) {
      return false;
    }
    return presentationFor(binding, regionId) === 'dialog';
  });
}

function onSlotSuccess(binding: LabIntegrationBindingRecord, regionId: string): void {
  closeSlot();
  if (!hideFormActionsFor(binding, regionId)) {
    emit('integration-success', { slot: binding.slot });
  }
}

function onDialogSuccess(): void {
  if (activeDialogBinding.value && activeDialogRow.value) {
    onSlotSuccess(activeDialogBinding.value, activeDialogRow.value.regionId);
  }
}

function onSlotCancel(binding: LabIntegrationBindingRecord): void {
  closeSlot();
  emit('integration-cancel', { slot: binding.slot });
}

function onDialogCancel(): void {
  if (activeDialogBinding.value) {
    onSlotCancel(activeDialogBinding.value);
  } else {
    closeSlot();
  }
}
</script>

<template>
  <div
    class="lab-integration-surface"
    :data-lab-integration-surface="surfaceId"
    :data-lab-integration-host="hostAppId"
  >
    <p v-if="loading" class="text-xs text-lab-general-text-muted">Loading integrations…</p>
    <p v-else-if="error" class="text-xs text-lab-danger">{{ error }}</p>

    <template v-else-if="surface">
      <section
        v-for="region in inlineRegions"
        :key="region.regionId"
        class="lab-integration-region mb-3"
        :data-lab-integration-region="region.regionId"
        :class="regionLayoutClass(region)"
      >
        <div
          v-if="showDialogTriggers && dialogTriggerBindingsInRegion(region.regionId).length"
          class="mb-2 flex flex-wrap items-center gap-2"
        >
          <Button
            v-for="binding in dialogTriggerBindingsInRegion(region.regionId)"
            :key="binding.id"
            type="button"
            :label="slotLabel(binding.slot)"
            severity="secondary"
            size="small"
            :pt="{
              root: {
                attrs: {
                  id: generateUniqueId(`lab-int-open-${binding.slot}`),
                  'data-lab-integration-open': binding.slot,
                },
              },
            }"
            @click="openSlot(binding.slot)"
          />
        </div>
        <template
          v-for="binding in bindingsInRegion(region.regionId)"
          :key="binding.id"
        >
          <LabIntegrationSlot
            v-if="
              presentationFor(binding, region.regionId) === 'inline'
                && isIntegrationSlotVisible(binding)
            "
            :ref="(el) => registerInlineSlotRef(binding.slot, el)"
            :host-app-id="hostAppId"
            :server-url="serverUrl"
            :peer-connector-urls="peerConnectorUrls"
            :binding="binding"
            :manifest="manifest"
            :context="integrationContext"
            :hide-form-actions="hideFormActionsFor(binding, region.regionId)"
            @success="onSlotSuccess(binding, region.regionId)"
            @cancel="onSlotCancel(binding)"
          />
        </template>
      </section>
    </template>

    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="activeDialogLabel"
      class="lab-integration-dialog lab-app-dialog w-full max-w-3xl"
      :pt="{
        root: { attrs: { id: dialogRootId } },
        mask: { class: 'lab-app-dialog lab-integration-dialog-mask' },
      }"
      @hide="closeSlot()"
    >
      <div class="flex flex-col gap-0 min-w-0">
        <LabIntegrationSlot
          class="shrink-0"
          v-if="activeDialogBinding"
          :host-app-id="hostAppId"
          :server-url="serverUrl"
          :peer-connector-urls="peerConnectorUrls"
          :binding="activeDialogBinding"
          :manifest="manifest"
          :context="integrationContext"
          @success="onDialogSuccess"
          @cancel="onDialogCancel"
        />
        <slot
          v-if="activeDialogBinding && activeDialogSlot"
          name="dialog-accessory"
          :slot-id="activeDialogSlot"
          :context="integrationContext"
        />
      </div>
    </Dialog>
  </div>
</template>
