import { useToast } from 'primevue/usetoast';
import type { ToastServiceMethods } from 'primevue/toastservice';

/**
 * Notifications for apps mounted in the lab shell. PrimeVue uses a global ToastEventBus —
 * `LabDashboard` owns the single top-center `<Toast>`. Do not mount `<Toast>` in app roots.
 */
export function useLabAppToast(): ToastServiceMethods {
  return useToast();
}
