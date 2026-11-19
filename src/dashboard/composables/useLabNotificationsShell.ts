import { watch, type Ref } from 'vue';
import { getLabSessionId } from '@/shared/composables/useLabPlatformAuth';
import { useLabNotifications } from '@/shared/composables/useLabNotifications';
import type { LabShellToastPayload } from '@/shared/types/lab-shell-toast';

export interface UseLabNotificationsShellOptions {
  serverUrl: string;
  isAuthenticated: Ref<boolean>;
  onShellToast?: (payload: LabShellToastPayload) => void;
}

export function useLabNotificationsShell(options: UseLabNotificationsShellOptions) {
  const labNotifications = useLabNotifications({
    serverUrl: options.serverUrl,
    isAuthenticated: options.isAuthenticated,
    onShellToast: options.onShellToast,
  });

  watch(
    () => options.isAuthenticated.value && Boolean(getLabSessionId()),
    (sessionReady) => {
      if (sessionReady) {
        labNotifications.connect();
      } else {
        labNotifications.disconnect();
      }
    },
    { immediate: true },
  );

  return labNotifications;
}
