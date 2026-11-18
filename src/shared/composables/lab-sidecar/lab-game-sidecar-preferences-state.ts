import { ref } from 'vue';
import { SessionManager } from '@/shared/composables/session/session-manager';
import {
  DEFAULT_LAB_GAME_SIDECAR_PREFERENCES,
  type LabGameSidecarPreferences,
} from '@/shared/types/lab-game-sidecar-preferences';

const sessionManager = new SessionManager();

export const labGameSidecarAutoOpen = ref(DEFAULT_LAB_GAME_SIDECAR_PREFERENCES.autoOpenSidecar);
export const labGameBanterDisabled = ref(DEFAULT_LAB_GAME_SIDECAR_PREFERENCES.banterDisabled);

let hydratePromise: Promise<void> | null = null;

export function isLabGameBanterDisabled(): boolean {
  return labGameBanterDisabled.value;
}

export function isLabGameSidecarAutoOpenEnabled(): boolean {
  return labGameSidecarAutoOpen.value;
}

export async function hydrateLabGameSidecarPreferences(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      await sessionManager.init();
      labGameSidecarAutoOpen.value = await sessionManager.getLabGameSidecarAutoOpen();
      labGameBanterDisabled.value = await sessionManager.getLabGameBanterDisabled();
    })();
  }
  await hydratePromise;
}

export async function saveLabGameSidecarPreferences(
  patch: Partial<LabGameSidecarPreferences>,
): Promise<void> {
  await hydrateLabGameSidecarPreferences();
  if (patch.autoOpenSidecar !== undefined) {
    labGameSidecarAutoOpen.value = patch.autoOpenSidecar;
    await sessionManager.setLabGameSidecarAutoOpen(patch.autoOpenSidecar);
  }
  if (patch.banterDisabled !== undefined) {
    labGameBanterDisabled.value = patch.banterDisabled;
    await sessionManager.setLabGameBanterDisabled(patch.banterDisabled);
  }
}

export async function markLabGameSidecarAutoOpenHintShown(): Promise<boolean> {
  await hydrateLabGameSidecarPreferences();
  const already = await sessionManager.getLabGameSidecarAutoOpenHintShown();
  if (already) {
    return false;
  }
  await sessionManager.setLabGameSidecarAutoOpenHintShown(true);
  return true;
}
