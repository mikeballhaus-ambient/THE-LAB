import { computed, onMounted, ref, shallowRef, type Ref } from 'vue';
import { fetchLabIntegrationBindings } from './fetch-lab-integration-bindings';
import { fetchLabIntegrationManifest } from './fetch-lab-integration-manifest';
import {
  bindingsForRegion,
  findIntegrationSurface,
  resolveBindingPresentation,
} from './resolve-integration-bindings';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import type { LabIntegrationBindingRecord } from '@/shared/types/lab-integrations';

export function useLabIntegrationSurface(
  hostAppId: Ref<string> | string,
  surfaceId: Ref<string> | string,
) {
  const manifest = shallowRef<AppLabIntegrationManifestV1 | null>(null);
  const bindings = shallowRef<LabIntegrationBindingRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeDialogSlot = ref<string | null>(null);

  const resolvedHostAppId = computed(() =>
    typeof hostAppId === 'string' ? hostAppId : hostAppId.value,
  );
  const resolvedSurfaceId = computed(() =>
    typeof surfaceId === 'string' ? surfaceId : surfaceId.value,
  );

  const surface = computed(() =>
    findIntegrationSurface(manifest.value, resolvedSurfaceId.value),
  );

  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [manifestRow, bindingRows] = await Promise.all([
        fetchLabIntegrationManifest(resolvedHostAppId.value),
        fetchLabIntegrationBindings(resolvedHostAppId.value),
      ]);
      manifest.value = manifestRow;
      bindings.value = bindingRows ?? [];
      if (!manifestRow) {
        error.value = 'Integration manifest unavailable';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load integrations';
    } finally {
      loading.value = false;
    }
  }

  function bindingsInRegion(regionId: string): LabIntegrationBindingRecord[] {
    return bindingsForRegion(
      bindings.value,
      manifest.value,
      resolvedSurfaceId.value,
      regionId,
    );
  }

  function presentationFor(binding: LabIntegrationBindingRecord, regionId: string) {
    const region = surface.value?.regions.find((row) => row.regionId === regionId);
    if (!region) {
      return 'inline' as const;
    }
    return resolveBindingPresentation(binding, region, manifest.value);
  }

  function openSlot(slot: string): void {
    activeDialogSlot.value = slot;
  }

  function closeSlot(): void {
    activeDialogSlot.value = null;
  }

  function hasEnabledBinding(slot: string): boolean {
    return bindings.value.some((row) => row.enabled && row.slot === slot);
  }

  function getInlineSlotsInRegion(regionId: string): string[] {
    return bindingsInRegion(regionId)
      .filter((binding) => presentationFor(binding, regionId) === 'inline')
      .map((binding) => binding.slot);
  }

  onMounted(() => {
    void refresh();
  });

  return {
    manifest,
    bindings,
    surface,
    loading,
    error,
    refresh,
    bindingsInRegion,
    presentationFor,
    activeDialogSlot,
    openSlot,
    closeSlot,
    hasEnabledBinding,
    getInlineSlotsInRegion,
  };
}
