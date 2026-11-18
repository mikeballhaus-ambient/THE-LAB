import { watch, type Ref } from 'vue';
import { getLabSessionId } from '@/shared/composables/useLabPlatformAuth';
import { useLabNotifications } from '@/shared/composables/useLabNotifications';

export interface UseLabNotificationsShellOptions {
  serverUrl: string;
  isAuthenticated: Ref<boolean>;
}

export function useLabNotificationsShell(options: UseLabNotificationsShellOptions) {
  const labNotifications = useLabNotifications({
    serverUrl: options.serverUrl,
    isAuthenticated: options.isAuthenticated,
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
