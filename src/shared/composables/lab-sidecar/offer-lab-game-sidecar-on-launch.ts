import type { ToastServiceMethods } from 'primevue/toastservice';
import { resolveGameAppInviteEntry } from '@/shared/config/game-app-invite-registry';
import { openLabSidecarPanel, labSidecarExpanded } from '@/shared/composables/lab-sidecar/lab-sidecar-shell-state';
import {
  hydrateLabGameSidecarPreferences,
  isLabGameSidecarAutoOpenEnabled,
  markLabGameSidecarAutoOpenHintShown,
} from '@/shared/composables/lab-sidecar/lab-game-sidecar-preferences-state';

/**
 * When a vs–Lab Assistant catalog game app launches, optionally expand Sidecar and
 * show a one-time hint that chat/banter can be tuned in Settings.
 */
export async function offerLabGameSidecarOnAppLaunch(
  appId: string,
  toast: ToastServiceMethods,
): Promise<void> {
  if (!resolveGameAppInviteEntry(appId)) {
    return;
  }
  await hydrateLabGameSidecarPreferences();
  if (!isLabGameSidecarAutoOpenEnabled()) {
    return;
  }
  if (!labSidecarExpanded.value) {
    openLabSidecarPanel();
  }
  const firstTime = await markLabGameSidecarAutoOpenHintShown();
  if (!firstTime) {
    return;
  }
  toast.add({
    severity: 'info',
    summary: 'Lab Assistant at the table',
    detail:
      'The Sidecar is open so you can chat with the Lab Assistant during vs games. ' +
      'Turn off auto-open or disable in-game banter anytime in Settings → Games & Sidecar.',
    life: 0,
  });
}

