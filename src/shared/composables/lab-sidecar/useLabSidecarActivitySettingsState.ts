import { ref, type Ref } from 'vue';
import {
  DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS,
  type LabSidecarActivitySettings,
} from '@/shared/types/lab-sidecar-activity-settings';
import { fetchPlatformLabSidecarActivitySettings } from '@/shared/services/platform-lab-sidecar-activity.client';

const settings = ref<LabSidecarActivitySettings>({ ...DEFAULT_LAB_SIDECAR_ACTIVITY_SETTINGS });
let loadPromise: Promise<void> | null = null;

export function getLabSidecarActivitySettingsRef(): Ref<LabSidecarActivitySettings> {
  return settings;
}

export function applyLabSidecarActivitySettings(next: LabSidecarActivitySettings): void {
  settings.value = { ...next, workingLabels: [...next.workingLabels] };
}

export async function ensureLabSidecarActivitySettingsLoaded(): Promise<void> {
  if (loadPromise) {
    await loadPromise;
    return;
  }
  loadPromise = (async () => {
    const fetched = await fetchPlatformLabSidecarActivitySettings();
    if (fetched) {
      applyLabSidecarActivitySettings(fetched);
    }
  })();
  await loadPromise;
}
